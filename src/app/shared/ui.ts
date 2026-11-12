import { ChangeDetectionStrategy, Component, Pipe, PipeTransform, computed, input } from '@angular/core';
import { ISSUE_PRIORITIES, IssuePriority, IssueType, Label, User } from '../core/models';

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) {
      <span class="avatar" [style.background]="u.avatarColor" [style.--size]="size() + 'px'" [title]="u.name">
        {{ initials() }}
      </span>
    } @else {
      <span class="avatar empty" [style.--size]="size() + 'px'" title="Unassigned">?</span>
    }
  `,
  styles: `
    .avatar {
      --size: 24px;
      display: inline-grid;
      place-items: center;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      color: #fff;
      font-size: calc(var(--size) * 0.42);
      font-weight: 600;
      flex-shrink: 0;
    }
    .empty {
      background: transparent;
      color: var(--text-muted);
      border: 1px dashed var(--border-strong);
    }
  `,
})
export class Avatar {
  readonly user = input<User | null | undefined>(null);
  readonly size = input(24);
  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
}

@Component({
  selector: 'app-label-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip" [style.--chip]="label().color">{{ label().name }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      color: var(--chip);
      background: color-mix(in srgb, var(--chip) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--chip) 35%, transparent);
      white-space: nowrap;
    }
  `,
})
export class LabelChip {
  readonly label = input.required<Label>();
}

const PRIORITY_BARS: Record<IssuePriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

@Component({
  selector: 'app-priority',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="priority" [class]="value()" [title]="label() + ' priority'">
      @if (value() === 'urgent') {
        <span class="urgent-mark">!</span>
      } @else {
        @for (bar of [1, 2, 3]; track bar) {
          <span class="bar" [class.on]="bar <= bars()" [style.height.px]="3 + bar * 3"></span>
        }
      }
      @if (showLabel()) {
        <span class="text">{{ label() }}</span>
      }
    </span>
  `,
  styles: `
    .priority {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      color: var(--text-muted);
    }
    .bar {
      width: 3px;
      border-radius: 1px;
      background: var(--border-strong);
    }
    .bar.on {
      background: var(--text-muted);
    }
    .high .bar.on {
      background: var(--warning);
    }
    .urgent-mark {
      display: inline-grid;
      place-items: center;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: var(--danger);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
    }
    .text {
      margin-left: 6px;
      align-self: center;
      font-size: 13px;
      color: var(--text);
    }
  `,
})
export class PriorityIcon {
  readonly value = input.required<IssuePriority>();
  readonly showLabel = input(false);
  protected readonly bars = computed(() => PRIORITY_BARS[this.value()]);
  protected readonly label = computed(() => ISSUE_PRIORITIES.find((p) => p.value === this.value())!.label);
}

const TYPE_ICONS: Record<IssueType, string> = { bug: '🐞', feature: '✨', task: '☑️' };

@Component({
  selector: 'app-type-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [title]="value()" aria-hidden="true">{{ icon() }}</span>`,
})
export class TypeIcon {
  readonly value = input.required<IssueType>();
  protected readonly icon = computed(() => TYPE_ICONS[this.value()]);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 days ago", "in 2 weeks", "just now". */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    return iso ? relativeTime(iso) : '';
  }
}
