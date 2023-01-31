const { injectAxe, checkA11y } = require('axe-playwright');


module.exports = {
  setup() {
    jest.setTimeout(15000)
  },

 async preRender(page, context) {
   await injectAxe(page);

 },
 async postRender(page, context) {
   await checkA11y(page, '#storybook-root', {
     detailedReport: true,
     detailedReportOptions: {
       html: true,
     },
   })
 },
};
