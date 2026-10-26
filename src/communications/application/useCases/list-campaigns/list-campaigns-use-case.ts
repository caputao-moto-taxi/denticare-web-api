import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import { requireCampaignAdmin } from '../../campaign-access.policy';

@Injectable()
export class ListCampaignsUseCase {
  constructor(private readonly repository: CommunicationsRepository) {}

  execute(user: AuthUser) {
    return this.repository.listCampaigns(requireCampaignAdmin(user));
  }
}
