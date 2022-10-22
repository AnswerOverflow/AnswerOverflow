module.exports ={
    endOfLine: "lf",
    printWidth: 150,
    quoteProps: "as-needed",
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: "none",
    useTabs: true,
    overrides: [
      {
        files: ".all-contributorsrc",
        options: {
          parser: "json"
        }
      },
      {
        files: "*.yml",
        options: {
          tabWidth: 2,
          useTabs: false
        }
      }
    ]
}