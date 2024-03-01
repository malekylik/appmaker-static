import type { OneOrMany } from './appmaker-domain';

export const oneOrManyRun = <T>(v: OneOrMany<T>, f: (v: NonNullable<T>) => void): void => v ? (Array.isArray(v) ? (v as Array<NonNullable<T>>).forEach(f) : f(v)) : undefined;

export const convertOneOrManyToArray = <T>(v: OneOrMany<T>): Array<NonNullable<T>> => (v ? (Array.isArray(v) ? v : [v]) : []) as Array<NonNullable<T>>;
