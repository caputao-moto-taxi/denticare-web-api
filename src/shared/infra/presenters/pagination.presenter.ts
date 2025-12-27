import { ObjectType, Field, Int } from '@nestjs/graphql';

export type PaginationPresenterProps = {
  currentPage: number;
  perPage: number;
  lastPage: number;
  total: number;
};

@ObjectType()
export class PaginationGraphQLPresenter {
  @Field(() => Int)
  currentPage: number;

  @Field(() => Int)
  perPage: number;

  @Field(() => Int)
  lastPage: number;

  @Field(() => Int)
  total: number;

  constructor(props: PaginationPresenterProps) {
    this.currentPage = props.currentPage;
    this.perPage = props.perPage;
    this.lastPage = props.lastPage;
    this.total = props.total;
  }
}
