/// <reference path="./dsh-client.d.ts" />

/** Client half of the dsh-composer-clock bundle.
 * Registers an interactive local-time strip into the `conversation.composer.dock` slot.
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
        copy: 'Copy',
        copied: 'Copied ✓',
        copyHint: 'Click to copy',
      },
      zh: {
        title: '本地时间',
        timezone: '时区',
        copy: '复制',
        copied: '已复制 ✓',
        copyHint: '点击复制',
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
              year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
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

    // Reports the settled outcome through onDone(true|false): the modern
    // clipboard API is asynchronous, so success is only known once it resolves.
    function writeClipboard(text: string, onDone: (ok: boolean) => void): void {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(
            () => onDone(true),
            () => onDone(false),
          );
          return;
        }
      } catch {
        // Fall through to the legacy path.
      }
      let ok = false;
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand('copy');
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
      onDone(ok);
    }

    const STRIP_STYLE_ID = 'dsh-composer-clock-style';
    const STRIP_CSS = [
      '.dsh-composer-clock-strip{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:4px 8px;margin:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:1.4;text-align:left;cursor:pointer;user-select:none;}',
      '.dsh-composer-clock-strip:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.dsh-composer-clock-strip:active{background:var(--dsw-alias-bg-layer-1);}',
      '.dsh-composer-clock-strip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.dsh-composer-clock-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:none;}',
      '.dsh-composer-clock-time{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;}',
      '.dsh-composer-clock-zone{margin-left:auto;color:var(--dsw-alias-state-idle-primary);}',
      '.dsh-composer-clock-hint{color:var(--dsw-alias-state-idle-primary);}',
      '.dsh-composer-clock-copied{color:var(--dsw-alias-state-success-primary);}',
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
      const [copied, setCopied] = React.useState<boolean>(false);
      const [, setLocaleTick] = React.useState<number>(0);
      const copiedTimerRef = React.useRef<(() => void) | null>(null);
      const aliveRef = React.useRef<boolean>(true);

      React.useEffect(() => {
        aliveRef.current = true;
        const stopTimer = ctx.timer.interval(() => setNow(new Date()), 1000);
        const unsubscribe = subscribeLocale(ctx, () => setLocaleTick((n) => n + 1));
        return () => {
          aliveRef.current = false;
          unsubscribe();
          stopTimer();
          if (copiedTimerRef.current) {
            copiedTimerRef.current();
            copiedTimerRef.current = null;
          }
        };
      }, []);

      const tag = localeTag(ctx);
      const copyHint = translate(ctx, tag, 'copyHint') + ' ' + formatStamp(now);
      const time =
        pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
      const zone = timeZoneName();

      function copyTimestamp(): void {
        writeClipboard(formatStamp(now), (ok) => {
          if (!ok || !aliveRef.current) return;
          setCopied(true);
          if (copiedTimerRef.current) copiedTimerRef.current();
          copiedTimerRef.current = ctx.timer.timeout(() => setCopied(false), 1600);
        });
      }

      return React.createElement(
        'button',
        {
          className: 'dsh-composer-clock-strip',
          type: 'button',
          onClick: copyTimestamp,
          'aria-label': copyHint,
          title: copyHint,
        },
        React.createElement('span', { className: 'dsh-composer-clock-dot', 'aria-hidden': true }),
        React.createElement('span', { className: 'dsh-composer-clock-time' }, time),
        React.createElement('span', { 'aria-hidden': true }, '·'),
        React.createElement('span', null, formatDate(now, tag, zone)),
        zone ? React.createElement('span', { className: 'dsh-composer-clock-zone' }, zone) : null,
        React.createElement(
          'span',
          {
            className: copied ? 'dsh-composer-clock-copied' : 'dsh-composer-clock-hint',
            'aria-live': 'polite',
          },
          copied ? translate(ctx, tag, 'copied') : translate(ctx, tag, 'copy'),
        ),
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
