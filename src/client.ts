/// <reference path="./dsh-client.d.ts" />

/** Client half of the dsh-composer-clock bundle.
 * Registers a local-time display into the `conversation.composer.dock` slot.
 *
 * IMPORTANT: every declaration lives inside the loader factory. The client plugin
 * loader may concatenate several client modules into one script, so a top-level
 * identifier here would collide with another plugin's (this bug already happened
 * between the `NS`/`DICTS`/`pad2` of two local plugins).
 *
 * Styles use only `--dsw-alias-*` theme tokens so light/dark themes both work.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-composer-clock',
  factory(require) {
    const React = require('react') as ReactLike;

    const NS = 'composerClock';

    const DICTS: Record<string, Record<string, string>> = {
      en: {
        title: 'Local time',
        timezone: 'Timezone',
      },
      zh: {
        title: '本地时间',
        timezone: '时区',
      },
    };

    function pad2(value: number): string {
      return value < 10 ? '0' + value : String(value);
    }

    function localeTag(ctx: DshClientContext): string {
      try {
        const snap: unknown = ctx.locale.getLocale();
        if (typeof snap === 'string') return snap;
        if (snap && typeof snap === 'object') {
          const record = snap as Record<string, unknown>;
          if (typeof record.locale === 'string') return record.locale;
          if (typeof record.id === 'string') return record.id;
        }
      } catch {
        // Fall through to the default tag.
      }
      return 'en';
    }

    let zoneCache: { checkedAt: number; zone: string } | null = null;
    let dateCache: { key: string; text: string } | null = null;
    let formatterCache: { tag: string; zone: string; value: Intl.DateTimeFormat } | null = null;

    function timeZoneName(): string {
      const checkedAt = Date.now();
      // Recheck periodically so an OS timezone change is picked up without reload.
      if (zoneCache && checkedAt >= zoneCache.checkedAt && checkedAt - zoneCache.checkedAt < 60000) {
        return zoneCache.zone;
      }
      let zone = '';
      try {
        zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {
        // Intl may be unavailable; local date formatting below still works.
      }
      zoneCache = { checkedAt, zone };
      return zone;
    }

    function formatDate(date: Date, tag: string, zone: string): string {
      const key = tag + '#' + zone + '#' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
      if (dateCache && dateCache.key === key) return dateCache.text;
      let text: string;
      try {
        if (!formatterCache || formatterCache.tag !== tag || formatterCache.zone !== zone) {
          formatterCache = {
            tag, zone,
            value: new Intl.DateTimeFormat(tag, {
              month: 'short', day: 'numeric', weekday: 'short',
              timeZone: zone || undefined,
            }),
          };
        }
        text = formatterCache.value.format(date);
      } catch {
        text = date.toLocaleDateString();
      }
      dateCache = { key, text };
      return text;
    }

    function formatStamp(date: Date): string {
      return (
        pad2(date.getFullYear()) +
        '-' +
        pad2(date.getMonth() + 1) +
        '-' +
        pad2(date.getDate()) +
        ' ' +
        pad2(date.getHours()) +
        ':' +
        pad2(date.getMinutes()) +
        ':' +
        pad2(date.getSeconds())
      );
    }

    const STRIP_STYLE_ID = 'dsh-composer-clock-style';
    const STRIP_CSS = [
      '[data-composer-dock]:has(.dsh-composer-clock-strip){flex-wrap:wrap;gap:2px 8px;}',
      '.dsh-composer-clock-strip{display:inline-flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;max-width:100%;min-height:24px;box-sizing:border-box;padding:2px 6px;margin:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.4;text-align:left;}',
      '.dsh-composer-clock-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:none;}',
      '.dsh-composer-clock-time{flex:none;white-space:nowrap;color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;}',
      '.dsh-composer-clock-date{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsh-composer-clock-zone{display:none;}',
    ].join('\n');

    function registerStripStyles(): () => void {
      try {
        if (document.getElementById(STRIP_STYLE_ID)) return () => {};
        const el = document.createElement('style');
        el.id = STRIP_STYLE_ID;
        el.textContent = STRIP_CSS;
        document.head.appendChild(el);
        return () => {
          el.remove();
        };
      } catch {
        return () => {};
      }
    }

    function translate(ctx: DshClientContext, tag: string, key: string): string {
      try {
        const t = ctx.locale.bind(NS);
        const text = t(key);
        if (typeof text === 'string' && text) return text;
      } catch {
        // Fall through to the bundled dictionaries.
      }
      const dict = DICTS[tag] || DICTS.en;
      return dict[key];
    }

    function subscribeLocale(ctx: DshClientContext, callback: () => void): () => void {
      try {
        return ctx.locale.subscribe(callback);
      } catch {
        return () => {};
      }
    }

    function ClockPanel(ctx: DshClientContext): unknown {
      const [now, setNow] = React.useState<Date>(() => new Date());
      const [, setLocaleTick] = React.useState<number>(0);

      React.useEffect(() => {
        const stopTimer = ctx.timer.interval(() => setNow(new Date()), 1000);
        const unsubscribe = subscribeLocale(ctx, () => setLocaleTick((n) => n + 1));
        return () => {
          unsubscribe();
          stopTimer();
        };
      }, []);

      const tag = localeTag(ctx);
      const time =
        pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
      const zone = timeZoneName();

      const detail = formatStamp(now) + (zone ? ' · ' + zone : '');

      return React.createElement(
        'time',
        {
          className: 'dsh-composer-clock-strip',
          dateTime: now.toISOString(),
          'aria-label': translate(ctx, tag, 'title') + ' ' + detail,
          title: detail,
        },
        React.createElement('span', { className: 'dsh-composer-clock-dot', 'aria-hidden': true }),
        React.createElement('span', { className: 'dsh-composer-clock-time' }, time),
        React.createElement('span', { 'aria-hidden': true }, '·'),
        React.createElement('span', { className: 'dsh-composer-clock-date' }, formatDate(now, tag, zone)),
        zone ? React.createElement('span', { className: 'dsh-composer-clock-zone' }, zone) : null,
      );
    }

    return {
      inject: ['slots', 'locale', 'timer'],
      apply(ctx) {
        const cleanups: Array<() => void> = [];
        const own = (dispose: unknown): void => {
          if (typeof dispose === 'function') cleanups.push(dispose as () => void);
        };

        // A locale failure must never keep the slot entry from registering.
        for (const id of Object.keys(DICTS)) {
          try {
            own(ctx.locale.register(NS, id, DICTS[id]));
          } catch {
            // The panel falls back to the bundled dictionaries below.
          }
        }

        own(registerStripStyles());

        own(
          ctx.slots.inject('conversation.composer.dock', () =>
            ctx.slots.register(
              {
                name: 'conversation.composer.dock',
                id: 'dsh-composer-clock',
                order: 5,
                label: () => {
                  try {
                    return translate(ctx, localeTag(ctx), 'title');
                  } catch {
                    return 'Local time';
                  }
                },
              },
              () => ClockPanel(ctx),
            ),
          ),
        );

        let disposed = false;
        return () => {
          if (disposed) return;
          disposed = true;
          for (const dispose of cleanups) {
            try {
              dispose();
            } catch {
              // Keep disposing the remaining resources.
            }
          }
        };
      },
    };
  },
});
