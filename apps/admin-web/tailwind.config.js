/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  important: true,
  theme: {
    extend: {
      colors: {
        // 语义色：全部来自 `src/settings/uiPalette.ts`，页面不写裸 hex。
        admin: {
          canvas: 'var(--admin-canvas)',
          surface: 'var(--admin-surface)',
          'surface-raised': 'var(--admin-surface-raised)',
          'surface-muted': 'var(--admin-surface-muted)',
          'surface-sunken': 'var(--admin-surface-sunken)',
          line: 'var(--admin-line)',
          'line-strong': 'var(--admin-line-strong)',
          ink: 'var(--admin-ink)',
          body: 'var(--admin-body)',
          muted: 'var(--admin-muted)',
          accent: 'var(--admin-accent)',
          'accent-hover': 'var(--admin-accent-hover)',
          'accent-soft': 'var(--admin-accent-soft)',
          'on-accent': 'var(--admin-on-accent)',
          solid: 'var(--admin-solid)',
          'solid-hover': 'var(--admin-solid-hover)',
          'on-solid': 'var(--admin-on-solid)',
          success: 'var(--admin-success)',
          warning: 'var(--admin-warning)',
          danger: 'var(--admin-danger)',
          info: 'var(--admin-info)',
        },
        // 旧类名保留映射，避免存量页面在迁移期间失去配色；迁移完成后删除。
        gray: {
          400: 'var(--admin-muted)',
          500: 'var(--admin-body)',
        },
        red: {
          500: 'var(--admin-danger)',
        },
      },
      fontSize: {
        'page-title': ['20px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'section-title': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'dialog-title': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        meta: ['12px', { lineHeight: '16px' }],
        'table-head': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' }],
      },
      borderRadius: {
        sm: 'var(--admin-radius-sm)',
        md: 'var(--admin-radius-md)',
        lg: 'var(--admin-radius-lg)',
      },
      boxShadow: {
        card: 'var(--admin-shadow)',
        pop: 'var(--admin-shadow-pop)',
        modal: 'var(--admin-shadow-modal)',
      },
      spacing: {
        'admin-row': 'var(--admin-row-height)',
        'admin-head': 'var(--admin-head-height)',
        'admin-control': 'var(--admin-control-height)',
        'admin-nav': 'var(--admin-nav-item)',
      },
      height: {
        control: 'var(--admin-control-height)',
        'row-base': 'var(--admin-row-height)',
        'head-base': 'var(--admin-head-height)',
        nav: 'var(--admin-nav-item)',
        topbar: '56px',
      },
      minHeight: {
        control: 'var(--admin-control-height)',
        row: 'var(--admin-row-height)',
      },
      screens: {
        // 管理端只保留三个布局档位：窄屏堆叠、中等收列、宽屏完整。
        compact: '768px',
        wide: '1100px',
        tablet: '960px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '160ms',
        pop: '200ms',
      },
    },
  },
};
