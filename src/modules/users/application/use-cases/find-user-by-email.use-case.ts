import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
  ) {}

  async execute(email: string) {
    return this.users.findByEmail(email.trim().toLowerCase());
  }
}
