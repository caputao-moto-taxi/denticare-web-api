import { StaffRole } from './user.roles';

export type UserProps = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  avatar: string;
};

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: StaffRole;
  readonly active: boolean;
  readonly avatar: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.role = props.role;
    this.active = props.active;
    this.avatar = props.avatar;
  }
}
