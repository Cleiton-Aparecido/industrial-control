import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from 'src/infra/users/abstract/user.repository';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly users: IUserRepository,
  ) {}

  async execute(id: string) {
    const user = await this.users.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
