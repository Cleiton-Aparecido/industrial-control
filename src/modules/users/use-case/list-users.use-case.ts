import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/infra/data/abstract/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
  ) {}

  async execute(page = 1, limit = 25) {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 25;
    const result = await this.users.findPage(safePage, safeLimit);
    return { ...result, page: safePage, limit: safeLimit };
  }
}
