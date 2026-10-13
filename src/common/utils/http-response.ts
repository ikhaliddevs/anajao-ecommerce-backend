export type ApiResponse<T> = {
  success: true;
  data: T;
};

export const ok = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data
});
