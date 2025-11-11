# Public pages for main-site

/m/[messageId|threadId]:
/[domain]/m/[messageId|threadId]:

- if
- if this is called with the non root message id, get the root message and redirect to the root message page

/c/[serverId]:

- The overview page for a community
- Has server icon, name, description, invite button, channel list
- First channel is selected by default & a list of threads is shown
- Should be indexed by search engines

/c/[serverId]/[channelId]:

- Same as /c/[serverId] but with the channel selected
- Should not be indexed by search engines

/u/[userId]:

- The user profile page
- Lists the servers the user is active in as a card of icon + server name
- Should not be indexed by search engines
