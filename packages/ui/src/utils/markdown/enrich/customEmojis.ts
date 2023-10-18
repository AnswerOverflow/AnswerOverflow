const customEmojis = (message: string) => {
  let result = message

  // TODO: Fix emojis
  // controller.state.emojis
  //   .values()
  //   .forEach(({ category, emoji, keywords: [keyword] }) => {
  //     if (category === 'custom')
  //       result = result.split(`:${keyword}:`).join(`<:${keyword}:${emoji}>`)
  //   })

  return result
}

export default customEmojis
