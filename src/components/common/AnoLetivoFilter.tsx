import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AnoLetivoFilterProps {
  value: string;
  onValueChange: (v: string) => void;
  years: string[];
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  /** Use "all" as option label for "Todos" (default true) */
  showAll?: boolean;
}

export default function AnoLetivoFilter({
  value,
  onValueChange,
  years,
  id = 'ano-filter',
  label = 'Ano Letivo',
  placeholder = 'Todos os anos',
  className,
  showAll = true,
}: AnoLetivoFilterProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAll && <SelectItem value="all">Todos</SelectItem>}
          {years.map((ano) => (
            <SelectItem key={ano} value={ano}>
              {ano}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
