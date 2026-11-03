module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  important: true,
  theme: {
    extend: {
      colors: {
        admin: {
          canvas: 'var(--admin-canvas)',
          surface: 'var(--admin-surface)',
          'surface-raised': 'var(--admin-surface-raised)',
          'surface-muted': 'var(--admin-surface-muted)',
          sand: 'var(--admin-sand)',
          'sand-deep': 'var(--admin-sand-deep)',
          ink: 'var(--admin-ink)',
          body: 'var(--admin-body)',
          muted: 'var(--admin-muted)',
          line: 'var(--admin-line)',
          primary: 'var(--admin-primary)',
          'primary-hover': 'var(--admin-primary-hover)',
          info: 'var(--admin-info)',
          success: 'var(--admin-success)',
          warning: 'var(--admin-warning)',
          error: 'var(--admin-error)',
        },
        gray: {
          400: 'var(--admin-muted)',
          500: 'var(--admin-body)',
        },
        red: {
          500: 'var(--admin-error)',
        },
      },
      screens: { tablet: '960px' },
    },
  },
};
