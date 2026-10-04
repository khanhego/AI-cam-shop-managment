// LiveAI components (window.LiveAI). Source: livesstream-ai-fe/src/components/{ui,Dialog,Pagination}.tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export interface IconProps { name: string; filled?: boolean; size?: number; className?: string }
export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated" | "danger" | "outlined-danger" | "text-danger";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: "sm" | "md"; icon?: string; trailingIcon?: string; fullWidth?: boolean;
}
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string; label: string; variant?: "standard" | "tonal" | "filled" | "danger";
}
interface FieldChrome { label: string; name: string; error?: string; hint?: string; className?: string }
export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & FieldChrome;
export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & FieldChrome;
export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome;
export interface AlertProps { kind?: "error" | "success" | "info" | "warning"; children: ReactNode; action?: ReactNode }
export type ChipTone = "neutral" | "primary" | "success" | "warning" | "error" | "live" | "info";
export interface StatusChipProps { tone?: ChipTone; icon?: string; title?: string; children: ReactNode; className?: string }
export interface LinearProgressProps { value: number; label: string; tone?: "primary" | "error" }
export interface PageHeaderProps { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }
export interface EmptyStateProps { icon: string; title: string; children?: ReactNode; action?: ReactNode }
export interface TabsProps<T extends string = string> { items: [T, ReactNode][]; value: T; onChange: (v: T) => void; label?: string }
export interface SegmentedButtonsProps<T extends string = string> { options: [T, string, string?][]; value: T; onChange: (v: T) => void; label: string }
export interface AuthCardProps { title: string; children: ReactNode; footer?: ReactNode }
export interface DialogProps { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean }
export interface PaginationProps { page: number; pageSize: number; total: number; onPage: (p: number) => void }

export declare function Icon(p: IconProps): JSX.Element;
export declare function Button(p: ButtonProps): JSX.Element;
export declare function IconButton(p: IconButtonProps): JSX.Element;
export declare function TextField(p: TextFieldProps): JSX.Element;
export declare function SelectField(p: SelectFieldProps): JSX.Element;
export declare function TextAreaField(p: TextAreaFieldProps): JSX.Element;
export declare function Alert(p: AlertProps): JSX.Element;
export declare function StatusChip(p: StatusChipProps): JSX.Element;
export declare function LinearProgress(p: LinearProgressProps): JSX.Element;
export declare function PageHeader(p: PageHeaderProps): JSX.Element;
export declare function EmptyState(p: EmptyStateProps): JSX.Element;
export declare function Tabs<T extends string>(p: TabsProps<T>): JSX.Element;
export declare function SegmentedButtons<T extends string>(p: SegmentedButtonsProps<T>): JSX.Element;
export declare function AuthCard(p: AuthCardProps): JSX.Element;
export declare function Dialog(p: DialogProps): JSX.Element | null;
export declare function Pagination(p: PaginationProps): JSX.Element;
