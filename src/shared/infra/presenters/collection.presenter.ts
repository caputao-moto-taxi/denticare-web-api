import { Exclude, Expose } from 'class-transformer';
import {
  PaginationGraphQLPresenter,
  PaginationPresenterProps,
} from './pagination.presenter';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export abstract class CollectionPresenter {
  @Exclude()
  protected paginationPresenter: PaginationGraphQLPresenter;

  constructor(props: PaginationPresenterProps) {
    this.paginationPresenter = new PaginationGraphQLPresenter(props);
  }

  @Field(() => PaginationGraphQLPresenter)
  @Expose({ name: 'meta' })
  get meta() {
    return this.paginationPresenter;
  }

  abstract get data(): any[];
}
