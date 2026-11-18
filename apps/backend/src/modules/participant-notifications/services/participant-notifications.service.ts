import { ParticipantIdentity } from '@/modules/participant-access/domain/participant-access';
import { ParticipantNotification } from '@/modules/participant-notifications/domain/participant-notification';
import { ParticipantNotificationsRepository } from '@/modules/participant-notifications/repositories/participant-notifications.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** Every read and write is bound to the account of the verified session. */
@Injectable()
export class ParticipantNotificationsService {
  constructor(
    private readonly repository: ParticipantNotificationsRepository,
  ) {}

  list(participant: ParticipantIdentity): Promise<ParticipantNotification[]> {
    return this.repository.list(participant.accountId);
  }

  async markRead(participant: ParticipantIdentity, id: string): Promise<void> {
    await this.assertOwn(participant, id);
    await this.repository.markRead(participant.accountId, [id], new Date());
  }

  /**
   * Marks the notifications the participant was shown as read. A notification
   * saved after the list was loaded stays unread; ids that are not the
   * account's own notifications are ignored.
   */
  async markAllRead(
    participant: ParticipantIdentity,
    shownIds: string[],
  ): Promise<void> {
    const shown = new Set(shownIds);
    const unread = (await this.repository.list(participant.accountId))
      .filter((notification) => !notification.isRead)
      .map((notification) => notification.id)
      .filter((id) => shown.has(id));
    if (unread.length === 0) return;
    await this.repository.markRead(participant.accountId, unread, new Date());
  }

  async dismiss(participant: ParticipantIdentity, id: string): Promise<void> {
    await this.assertOwn(participant, id);
    await this.repository.dismiss(participant.accountId, id, new Date());
  }

  /** Another participant's notification is answered like a missing one. */
  private async assertOwn(
    participant: ParticipantIdentity,
    id: string,
  ): Promise<void> {
    if (!(await this.repository.isOwn(participant.accountId, id))) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'notification_not_found',
        message: 'Oznámení není dostupné.',
      });
    }
  }
}
