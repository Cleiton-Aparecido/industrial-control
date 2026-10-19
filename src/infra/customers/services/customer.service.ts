import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ICustomerRepository } from '../abstract/customer.repository';
import { AuditLogService } from 'src/infra/data/audit-log.service';
import { isUniqueConstraintViolation } from 'src/infra/data/is-unique-constraint-violation';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../../modules/customers/application/dto/customer.dto';
import {
  identifyAndValidateDocument,
  normalizeDocument,
} from '../../../modules/customers/application/document-number';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(ICustomerRepository)
    private readonly customers: ICustomerRepository,
    private readonly audit: AuditLogService,
  ) {}

  async create(input: CreateCustomerDto, actorId: string) {
    const documentNumber = normalizeDocument(input.documentNumber);
    const documentType = identifyAndValidateDocument(documentNumber);
    try {
      const customer = await this.customers.create({
        documentType,
        documentNumber,
        name: input.name,
        tradeName: input.tradeName ?? null,
        address: input.address ?? null,
        phone: input.phone ?? null,
        email: input.email?.toLowerCase() ?? null,
        notes: input.notes ?? null,
        isActive: true,
      });
      await this.audit.record(
        actorId,
        'customer.created',
        'customer',
        customer.id,
      );
      return customer;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('CPF ou CNPJ já cadastrado');
      }
      throw error;
    }
  }

  async findByDocument(rawDocument: string) {
    const documentNumber = normalizeDocument(rawDocument);
    identifyAndValidateDocument(documentNumber);
    const customer = await this.customers.findByDocument(documentNumber);
    return { found: Boolean(customer), customer: customer ?? null };
  }

  async list(page = 1, limit = 25, search?: string) {
    const { items, total } = await this.customers.findPage(page, limit, search);
    return { items, total, page, limit };
  }

  async get(id: string) {
    const customer = await this.customers.findById(id);
    if (!customer) throw new NotFoundException('Cliente não encontrado');
    return customer;
  }

  async update(id: string, input: UpdateCustomerDto, actorId: string) {
    const customer = await this.get(id);
    Object.assign(customer, input);
    if (input.email !== undefined) customer.email = input.email.toLowerCase();
    await this.customers.save(customer);
    await this.audit.record(actorId, 'customer.updated', 'customer', id, {
      changedFields: Object.keys(input),
    });
    return customer;
  }

  async setActive(id: string, isActive: boolean, actorId: string) {
    const customer = await this.get(id);
    customer.isActive = isActive;
    await this.customers.save(customer);
    await this.audit.record(
      actorId,
      isActive ? 'customer.activated' : 'customer.deactivated',
      'customer',
      id,
    );
    return customer;
  }
}
