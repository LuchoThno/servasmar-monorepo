export interface ExampleType {
  id: number;
  name: string;
  description?: string;
}

export interface ComponentProps {
  title: string;
  onClick: () => void;
}

export type ApiResponse<T> = {
  data: T;
  error?: string;
};