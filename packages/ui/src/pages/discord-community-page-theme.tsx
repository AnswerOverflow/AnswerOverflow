import { ServerPublic } from "@answeroverflow/api/router/types";
import { CommunityPageData } from "@answeroverflow/core/pages";
import { MessagesSearchBar } from '../messages-search-bar';
import { ThinMessage } from '../message/thin-message';
import { ServerInvite } from '../server-invite';
import { DiscordAvatar } from '../discord-avatar';


export const DiscordCommunityPageTheme = (
  props: CommunityPageData & {
    tenant: ServerPublic | undefined;
    selectedChannel:
      | Pick<CommunityPageData, "channels">["channels"][number]
      | undefined;
    page: number | undefined;
    uwu?: boolean;
  }
) => {
  const {
    server,
    channels,
    selectedChannel: maybeSelectedChannel,
    tenant,
    posts: questions,
  } = props;
  const selected = maybeSelectedChannel ?? channels[0];

  // TO BE REPLACED BY ACTUAL CHANNELS FROM THE SERVER
  // Generate example Discord channels
  // just to test the theme behaviour locally
  const exampleServers = [
    { id: "1", name: "General Discussion" },
    { id: "2", name: "Tech Support" },
    { id: "3", name: "Development" },
    { id: "4", name: "Gaming" },
  ];

  const exampleRules = [
    { id: "1", name: "Community Guidelines" },
    { id: "2", name: "Code of Conduct" },
    { id: "3", name: "Moderation Rules" },
    { id: "4", name: "Channel Rules" },
  ];

  // TO BE REPLACED BY ACTUAL MESSAGES FROM THE SERVER
  // Generate random Discord users with profile images
  // just to test the theme behaviour locally
  const generateDiscordUsers = () => {
    const usernames = [
      "CodeMaster2024",
      "PixelWizard",
      "TechNinja",
      "ByteHunter",
      "DevGuru",
      "ScriptKiddie",
      "DataDragon",
      "CloudSurfer",
      "BugSquasher",
      "AlgoExplorer",
    ];

    const colors = [
      "#5865f2",
      "#57f287",
      "#fee75c",
      "#eb459e",
      "#ed4245",
      "#f38ba8",
      "#89b4fa",
      "#a6e3a1",
      "#fab387",
      "#cba6f7",
    ];

    return usernames.map((username, index) => ({
      id: `user_${index}`,
      username,
      color: colors[index % colors.length],
      avatar: `https://cdn.discordapp.com/embed/avatars/${index % 6}.png`,
    }));
  };

  const discordUsers = generateDiscordUsers();

  // TO BE REPLACED BY ACTUAL DATE CUTOFFS
  // Generate example date cutoffs between messages
  // just to test the theme behaviour locally
  const createExampleMessages = () => {
    const messages = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Test date cutoff messages from 'two days ago'
    messages.push({
      id: "msg_1",
      user: discordUsers[0],
      content:
        "Hey everyone! I'm having trouble with my React components not re-rendering properly. Any ideas?",
      timestamp: twoDaysAgo,
      showDateCutoff: true,
      dateCutoff: twoDaysAgo.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });

    messages.push({
      id: "msg_2",
      user: discordUsers[1],
      content:
        "Have you tried using useEffect with the proper dependencies? That usually fixes re-rendering issues.",
      timestamp: twoDaysAgo,
      showDateCutoff: false,
    });

    // Test date cutoff messages from 'yesterday'
    messages.push({
      id: "msg_3",
      user: discordUsers[2],
      content:
        "I'm working on a new Discord bot and need help with slash commands. The documentation is confusing.",
      timestamp: yesterday,
      showDateCutoff: true,
      dateCutoff: yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });

    messages.push({
      id: "msg_4",
      user: discordUsers[3],
      content:
        "Check out the discord.js guide! It has great examples for slash commands. Also make sure you're using the latest version.",
      timestamp: yesterday,
      showDateCutoff: false,
    });

    messages.push({
      id: "msg_5",
      user: discordUsers[4],
      content:
        "Here's a quick example:\n\nconst { SlashCommandBuilder } = require('discord.js');\n\nmodule.exports = {\n  data: new SlashCommandBuilder()\n    .setName('ping')\n    .setDescription('Replies with Pong!'),\n  async execute(interaction) {\n    await interaction.reply('Pong!');\n  },\n};\n",
      timestamp: yesterday,
      showDateCutoff: false,
    });

    // Test date cutoff messages from 'today'
    messages.push({
      id: "msg_6",
      user: discordUsers[5],
      content:
        "Thanks for the help yesterday! My bot is working now. Does anyone know how to add database integration?",
      timestamp: today,
      showDateCutoff: true,
      dateCutoff: "Today",
    });

    messages.push({
      id: "msg_7",
      user: discordUsers[6],
      content:
        "For databases, I recommend starting with SQLite for simple projects or PostgreSQL for more complex ones. Prisma is a great ORM to use with either.",
      timestamp: today,
      showDateCutoff: false,
    });

    return messages;
  };

  const exampleMessages = createExampleMessages();

  return (
    <div className="flex flex-col min-h-screen bg-[#36393f]">
      {/* Header with Logo and Search - TO-DO: Use partial transparency 'frosted-glass'
      effect to carry through from the page background gradient */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#2f3136] shadow-lg border-b border-[#202225]">
        <div className="relative max-w-none w-full px-4 py-3">
          <div className="relative flex items-center justify-between w-full">
            {/* Left side - Logo */}
            <div className="flex items-center flex-shrink-0">
              <img
                src="/server-logo.png" // Replace with your customer's server logo URL
                alt="Server Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            {/* Center - Search Bar */}
            <div className="flex items-center flex-1 max-w-2xl mx-8 min-w-0 translate-y-2">
              <MessagesSearchBar 
                placeholder="Search channels, questions..."
                className="w-full"
                serverId={server.id}
              />
            </div>

            {/* Right side - User Actions */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Try <Server_Name> Button - Opens in new tab */}
              <a
                href="https://mysite.com" // Change to customer's desired homepage URL
                target="_blank"
                rel="noopener noreferrer"
                className="
                  bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700
                  hover:from-orange-600 hover:via-orange-700 hover:to-orange-800
                  text-white 
                  font-medium
                  px-6 
                  py-3 
                  rounded-full 
                  text-base
                  transition-colors 
                  duration-200 
                  transform 
                  hover:scale-[1.02] 
                  active:scale-[0.98] 
                  shadow-md
                  hover:shadow-lg
                  border 
                  border-orange-500/30
                  mr-2
                "
              >
                <span>Try "Server_Name"</span> 
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust top padding for content to account for fixed header */}
      <div className="flex-1">
        {/* Main Content Container - starts from top */}
        <div className="flex flex-row h-screen overflow-hidden">
          {/* Left Sidebar - Discord's sidebar color - extends to top */}
          <div className="w-60 bg-[#2f3136] border-r border-[#202225] flex flex-col h-full overflow-y-auto">
            {/* Spacer for fixed header */}
            <div className="h-20 flex-shrink-0"></div>
            
            <div className="p-3 flex-1 overflow-y-auto">
              {/* Server Info Block - Discord style */}
              <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f1b] border border-purple-900/30 rounded-lg p-4 shadow-sm mb-4">
                <div className="text-[#dcddde]">
                  <div className="font-semibold text-base mb-1 text-white">
                    "Server_Name" on Discord
                  </div>
                  <div className="text-sm text-purple-300 mb-2">
                    Jump into the Server_Name's Discord now
                  </div>
                  <div className="font-bold text-sm mb-3 text-green-400">
                    420,000 members
                  </div>
                </div>
                <a
                  href="https://discord.gg/invitelink"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gradient-to-r from-[#6a5acd] via-[#483d8b] to-[#4b0082] text-white font-medium py-2 px-3 rounded text-sm transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-center block"
                >
                  Join the Conversation
                </a>
              </div>

              {/* Server Category Dropdown Example 1 - Discord style TO-DO: Replace with server's actual categories */}
              <details className="mb-3" open>
                <summary className="w-full flex items-center justify-between p-2 text-[#dcddde] hover:bg-[#36393f] rounded cursor-pointer list-none text-sm font-medium">
                  <span className="text-[#8e9297] uppercase text-xs font-semibold tracking-wide">
                    Category 1
                  </span>
                  <svg
                    className="w-3 h-3 transition-transform details-open:rotate-180 text-[#8e9297]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="mt-1 ml-2 flex flex-col">
                  {exampleServers.map((server) => (
                    <div
                      key={server.id}
                      className="p-1.5 px-2 rounded hover:bg-[#36393f] cursor-pointer text-[#b9bbbe] hover:text-[#dcddde] text-sm transition-colors"
                    >
                      <span className="text-[#8e9297] mr-2">#</span>
                      {server.name}
                    </div>
                  ))}
                </div>
              </details>

              {/* Server Category Dropdown Example 2 (Rules) - Discord style TO-DO: Replace with server's actual categories */}
              <details className="mb-4" open>
                <summary className="w-full flex items-center justify-between p-2 text-[#dcddde] hover:bg-[#36393f] rounded cursor-pointer list-none text-sm font-medium">
                  <span className="text-[#8e9297] uppercase text-xs font-semibold tracking-wide">
                    Category 2
                  </span>
                  <svg
                    className="w-3 h-3 transition-transform details-open:rotate-180 text-[#8e9297]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="mt-1 ml-2 flex flex-col">
                  {exampleRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-1.5 px-2 rounded hover:bg-[#36393f] cursor-pointer text-[#b9bbbe] hover:text-[#dcddde] text-sm transition-colors"
                    >
                      <span className="text-[#8e9297] mr-2">📋</span>
                      {rule.name}
                    </div>
                  ))}
                </div>
              </details>

              {/* Server Category Dropdown Example 3 (Text Channels) - Discord style TO-DO: Replace with server's actual categories */}
              {/* !!!!!!!!!!! This was Rhys' implementation I started with !!!!!!!!!!!
              I have no idea how this works in practice but I'll leave it */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-[#8e9297] uppercase text-xs font-semibold tracking-wide">
                    Text Channels
                  </span>
                </div>
                <div className="flex flex-col">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center p-1.5 px-2 rounded hover:bg-[#36393f] cursor-pointer text-[#b9bbbe] hover:text-[#dcddde] text-sm transition-colors group"
                    >
                      <span className="text-[#8e9297] mr-2 group-hover:text-[#b9bbbe]">
                        #
                      </span>
                      <span className="truncate">{channel.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area - Discord's main chat area color */}
          <div className="flex-1 bg-[#36393f] flex flex-col h-full pt-20">
            {/* Channel Header */}
            <div className="bg-[#36393f] border-b border-[#2f3136] px-4 py-3 shadow-sm">
              <div className="flex items-center">
                <span className="text-[#8e9297] mr-2">#</span>
                <span className="text-white font-semibold text-base">
                  {selected?.name}
                </span>
                <div className="ml-4 h-6 w-px bg-[#2f3136]"></div>
                <span className="ml-4 text-[#b9bbbe] text-sm">
                  Channel topic or description
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto relative">
              <div className="flex flex-col gap-4">
                {/* Questions - Discord message style */}
                <div className="flex flex-col gap-3 relative">
                  {/* Fade overlay for bottom 25% of messages (save bandwidth/API calls
                  and encourage the user to just join the Discord server) */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-[#36393f] via-[#36393f]/50 to-transparent z-10"></div>
                  </div>

                  {exampleMessages.map((message) => (
                    <div key={message.id}>
                      {/* Date Cutoff */}
                      {message.showDateCutoff && (
                        <div className="flex items-center my-6">
                          <div className="flex-1 h-px bg-[#2f3136]"></div>
                          <div className="px-4 py-1 bg-[#2f3136] rounded-full">
                            <span className="text-[#8e9297] text-xs font-semibold">
                              {message.dateCutoff}
                            </span>
                          </div>

                          <div className="flex-1 h-px bg-[#2f3136]"></div>
                        </div>
                      )}

                      {/* Message */}
                      <div className="hover:bg-[#32353b] p-3 rounded group transition-colors">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                            style={{ backgroundColor: message.user.color }}
                          >
                            {message.user.username.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Message header */}
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-white font-medium text-sm">
                                {message.user.username}
                              </span>
                              <span className="text-[#72767d] text-xs">
                                {message.timestamp.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {/* Message content */}
                            <div className="text-[#dcddde] text-sm leading-relaxed break-words">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join Conversation Overlay - positioned to sit on top of faded messages
              TO-DO: Have it extend all the way across the screen */}
              <div className="fixed bottom-0 left-60 right-0 top-auto p-0 flex flex-col items-center justify-center text-center z-20">
                <div className="bg-gradient-to-t from-[#36393f] via-[#36393f]/80 via-[#36393f]/40 to-[#36393f]/0 p-6 shadow-xl w-full h-full flex flex-col items-center justify-center">
                  <h3 className="text-white text-xl font-semibold mb-4">
                    Don't wait to join the conversation!
                  </h3>
                  <a
                    href="https://discord.gg/invitelink" // Change to customer's desired invite link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-block bg-gradient-to-r from-[#6a5acd] via-[#483d8b] to-[#4b0082] text-white font-medium py-3 px-4 rounded text-sm transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-center max-w-md mx-auto"
                  >
                    Join Server_Name's Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
