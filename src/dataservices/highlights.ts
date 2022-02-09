import { Knex } from 'knex';
import { IContext } from '../context';
import { Highlight, HighlightEntity } from '../types';
import { NotFoundError } from '@pocket-tools/apollo-utils';

export class HighlightsDataService {
  public readonly userId: string;
  public readonly readDb: Knex;
  constructor(context: IContext) {
    this.userId = context.userId;
    this.readDb = context.db.readClient;
  }
  private toGraphql(entity: HighlightEntity): Highlight {
    return {
      id: entity.annotation_id,
      quote: entity.quote,
      patch: entity.patch,
      version: entity.version,
      _createdAt: entity.created_at.getTime() / 1000,
      _updatedAt: entity.updated_at.getTime() / 1000,
    };
  }

  /**
   * Helper function to determine whether an item exists in a User's List
   * @param itemId the itemId to look for in the User's List
   * @returns true if the itemId is in the User's List, false otherwise
   */
  async isItemInList(itemId: string): Promise<boolean> {
    const listItem = await this.readDb('list')
      .pluck('item_id')
      .where('item_id', itemId)
      .andWhere('user_id', this.userId);
    return listItem.length > 0;
  }
  /**
   * Get highlights associated with an item in a user's list
   * @param itemid the itemId in the user's list
   * @throws NotFoundError if the itemId doesn't exist in the user's list
   * @returns a list of Highlights associated to the itemId, or an empty list
   * if there are no highlights on a given itemId
   */
  async getHighlightsByItemId(itemId: string): Promise<Highlight[]> {
    const rows = await this.readDb<HighlightEntity>('user_annotations')
      .select()
      .where('item_id', itemId)
      .andWhere('user_id', this.userId)
      .andWhere('status', 1);

    if (rows.length > 0) {
      return rows.map(this.toGraphql);
    }
    return [];
  }
}
