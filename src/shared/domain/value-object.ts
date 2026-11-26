import isEqual from 'lodash/isEqual';

export abstract class ValueObject {
  public equals(vo: unknown): boolean {
    if (!(vo instanceof ValueObject)) {
      return false;
    }

    if (vo.constructor.name !== this.constructor.name) {
      return false;
    }

    return isEqual(vo, this);
  }
}
