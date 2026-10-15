// The shape of every paginated list returned by the API.
// T is the type of one item in the list (Student, Section, ...).
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}