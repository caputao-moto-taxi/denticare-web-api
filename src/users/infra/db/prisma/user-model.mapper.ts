import { Prisma } from '../../../../../generated/prisma/client';
import { joinName } from '../../../../shared/helpers/staff';
import { User } from '../../../domain/user.entity';
import { StaffRole } from '../../../domain/user.roles';

export const USER_INCLUDE = {
  Role: { select: { slug: true } },
  Person: {
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, phoneNumber: true },
    take: 1,
  },
  doctorProfile: { select: { avatar: true } },
} satisfies Prisma.UserInclude;

export type UserRow = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

export class UserModelMapper {
  static toEntity(model: UserRow): User {
    const slug = model.Role?.slug;
    const role: StaffRole =
      slug === 'admin' || slug === 'administrator'
        ? 'admin'
        : slug === 'doctor' || slug === 'nurse'
          ? slug
          : 'secretary';

    return new User({
      id: model.id,
      name: joinName(model.Person[0], model.email),
      email: model.email,
      phone: model.Person[0]?.phoneNumber ?? '',
      role,
      active: model.isActive,
      avatar: model.doctorProfile?.avatar ?? '',
    });
  }
}
