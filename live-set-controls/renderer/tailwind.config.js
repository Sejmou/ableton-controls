module.exports = {
  content: [
    './renderer/pages/**/*.{js,ts,jsx,tsx}',
    './renderer/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        fr: 'repeat(auto-fit, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};
