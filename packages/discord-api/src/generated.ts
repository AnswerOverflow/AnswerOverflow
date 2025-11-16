import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class SnowflakeType extends S.String.pipe(S.pattern(new RegExp("^(0|[1-9][0-9]*)$"))) {}

export class ApplicationTypes extends S.Literal(4) {}

export class Int53Type extends S.Int.pipe(S.greaterThanOrEqualTo(-9007199254740991), S.lessThanOrEqualTo(9007199254740991)) {}

export class UserAvatarDecorationResponse extends S.Class<UserAvatarDecorationResponse>("UserAvatarDecorationResponse")({
  "asset": S.String,
  "sku_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class NameplatePalette extends S.String {}

export class UserNameplateResponse extends S.Class<UserNameplateResponse>("UserNameplateResponse")({
  "sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "asset": S.String,
  "label": S.String,
  "palette": NameplatePalette
}) {}

export class UserCollectiblesResponse extends S.Class<UserCollectiblesResponse>("UserCollectiblesResponse")({
  "nameplate": S.optionalWith(UserNameplateResponse, { nullable: true })
}) {}

export class UserPrimaryGuildResponse extends S.Class<UserPrimaryGuildResponse>("UserPrimaryGuildResponse")({
  "identity_guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "identity_enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "tag": S.optionalWith(S.String, { nullable: true }),
  "badge": S.optionalWith(S.String, { nullable: true })
}) {}

export class UserResponse extends S.Class<UserResponse>("UserResponse")({
  "id": SnowflakeType,
  "username": S.String,
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "discriminator": S.String,
  "public_flags": S.Int,
  "flags": Int53Type,
  "bot": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Boolean, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "accent_color": S.optionalWith(S.Int, { nullable: true }),
  "global_name": S.optionalWith(S.String, { nullable: true }),
  "avatar_decoration_data": S.optionalWith(UserAvatarDecorationResponse, { nullable: true }),
  "collectibles": S.optionalWith(UserCollectiblesResponse, { nullable: true }),
  "primary_guild": S.optionalWith(UserPrimaryGuildResponse, { nullable: true })
}) {}

export class OAuth2Scopes extends S.Union(/**
* allows /users/@me without email
*/
S.Literal("identify"),
S.Literal("email"),
S.Literal("connections"),
S.Literal("guilds"),
S.Literal("guilds.join"),
S.Literal("guilds.members.read"),
S.Literal("gdm.join"),
S.Literal("bot"),
S.Literal("rpc"),
S.Literal("rpc.notifications.read"),
S.Literal("rpc.voice.read"),
S.Literal("rpc.voice.write"),
S.Literal("rpc.video.read"),
S.Literal("rpc.video.write"),
S.Literal("rpc.screenshare.read"),
S.Literal("rpc.screenshare.write"),
S.Literal("rpc.activities.write"),
S.Literal("webhook.incoming"),
S.Literal("messages.read"),
S.Literal("applications.builds.upload"),
S.Literal("applications.builds.read"),
S.Literal("applications.commands"),
S.Literal("applications.commands.permissions.update"),
S.Literal("applications.commands.update"),
S.Literal("applications.store.update"),
S.Literal("applications.entitlements"),
S.Literal("activities.read"),
S.Literal("activities.write"),
S.Literal("activities.invites.write"),
S.Literal("relationships.read"),
S.Literal("voice"),
S.Literal("dm_channels.read"),
S.Literal("role_connections.write"),
S.Literal("openid")) {}

export class ApplicationOAuth2InstallParamsResponse extends S.Class<ApplicationOAuth2InstallParamsResponse>("ApplicationOAuth2InstallParamsResponse")({
  "scopes": S.Array(S.Literal("applications.commands", "bot")),
  "permissions": S.String
}) {}

export class ApplicationExplicitContentFilterTypes extends S.Union(/**
* inherit guild content filter setting
*/
S.Literal(0),
S.Literal(1)) {}

export class TeamMembershipStates extends S.Union(/**
* User has been invited to the team.
*/
S.Literal(1),
S.Literal(2)) {}

export class TeamMemberResponse extends S.Class<TeamMemberResponse>("TeamMemberResponse")({
  "user": UserResponse,
  "team_id": SnowflakeType,
  "membership_state": TeamMembershipStates
}) {}

export class TeamResponse extends S.Class<TeamResponse>("TeamResponse")({
  "id": SnowflakeType,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "name": S.String,
  "owner_user_id": SnowflakeType,
  "members": S.Array(TeamMemberResponse)
}) {}

export class PrivateApplicationResponse extends S.Class<PrivateApplicationResponse>("PrivateApplicationResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String,
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "primary_sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "bot": S.optionalWith(UserResponse, { nullable: true }),
  "slug": S.optionalWith(S.String, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rpc_origins": S.optionalWith(S.Array(S.String), { nullable: true }),
  "bot_public": S.optionalWith(S.Boolean, { nullable: true }),
  "bot_require_code_grant": S.optionalWith(S.Boolean, { nullable: true }),
  "terms_of_service_url": S.optionalWith(S.String, { nullable: true }),
  "privacy_policy_url": S.optionalWith(S.String, { nullable: true }),
  "custom_install_url": S.optionalWith(S.String, { nullable: true }),
  "install_params": S.optionalWith(ApplicationOAuth2InstallParamsResponse, { nullable: true }),
  "integration_types_config": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "verify_key": S.String,
  "flags": S.Int,
  "max_participants": S.optionalWith(S.Int, { nullable: true }),
  "tags": S.optionalWith(S.Array(S.String), { nullable: true }),
  "redirect_uris": S.Array(S.String),
  "interactions_endpoint_url": S.optionalWith(S.String, { nullable: true }),
  "role_connections_verification_url": S.optionalWith(S.String, { nullable: true }),
  "owner": UserResponse,
  "approximate_guild_count": S.optionalWith(S.Int, { nullable: true }),
  "approximate_user_install_count": S.Int,
  "approximate_user_authorization_count": S.Int,
  "explicit_content_filter": ApplicationExplicitContentFilterTypes,
  "team": S.optionalWith(TeamResponse, { nullable: true })
}) {}

export class RatelimitedResponse extends S.Class<RatelimitedResponse>("RatelimitedResponse")({
"retry_after": S.Number,
"global": S.Boolean,
"code": S.Int,
"message": S.String
}) {}

export class Error extends S.Class<Error>("Error")({
"code": S.Int,
"message": S.String
}) {}

export class InnerErrors extends S.Class<InnerErrors>("InnerErrors")({
"_errors": S.Array(Error)
}) {}

export class ErrorDetails extends S.Union(S.Record({ key: S.String, value: S.Unknown }),
InnerErrors) {}

export class ErrorResponse extends S.Class<ErrorResponse>("ErrorResponse")({
  "errors": S.optionalWith(ErrorDetails, { nullable: true }),
"code": S.Int,
"message": S.String
}) {}

export class ApplicationOAuth2InstallParams extends S.Class<ApplicationOAuth2InstallParams>("ApplicationOAuth2InstallParams")({
  "scopes": S.optionalWith(S.NonEmptyArray(S.Literal("applications.commands", "bot")).pipe(S.minItems(1)), { nullable: true }),
  "permissions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(9007199254740991)), { nullable: true })
}) {}

export class ApplicationFormPartial extends S.Class<ApplicationFormPartial>("ApplicationFormPartial")({
  "description": S.optionalWith(S.Struct({
  "default": S.String.pipe(S.maxLength(400)),
  "localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}), { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "team_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "interactions_endpoint_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "explicit_content_filter": S.optionalWith(ApplicationExplicitContentFilterTypes, { nullable: true }),
  "max_participants": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(-1)), { nullable: true }),
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "tags": S.optionalWith(S.Array(S.String.pipe(S.maxLength(20))).pipe(S.maxItems(5)), { nullable: true }),
  "custom_install_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "install_params": S.optionalWith(ApplicationOAuth2InstallParams, { nullable: true }),
  "role_connections_verification_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "integration_types_config": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class EmbeddedActivityLocationKind extends S.Union(/**
* guild channel
*/
S.Literal("gc"),
S.Literal("pc"),
S.Literal("party")) {}

export class GuildChannelLocation extends S.Class<GuildChannelLocation>("GuildChannelLocation")({
  "id": S.String,
  "kind": S.Literal("gc"),
  "channel_id": SnowflakeType,
  "guild_id": SnowflakeType
}) {}

export class PrivateChannelLocation extends S.Class<PrivateChannelLocation>("PrivateChannelLocation")({
  "id": S.String,
  "kind": S.Literal("pc"),
  "channel_id": SnowflakeType
}) {}

export class EmbeddedActivityInstance extends S.Class<EmbeddedActivityInstance>("EmbeddedActivityInstance")({
  "application_id": SnowflakeType,
  "instance_id": S.String,
  "launch_id": S.String,
  "location": S.Union(GuildChannelLocation,
PrivateChannelLocation),
  "users": S.Array(SnowflakeType)
}) {}

export class UploadApplicationAttachmentRequest extends S.Class<UploadApplicationAttachmentRequest>("UploadApplicationAttachmentRequest")({
  "file": S.instanceOf(globalThis.Blob)
}) {}

export class ApplicationResponse extends S.Class<ApplicationResponse>("ApplicationResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String,
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "primary_sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "bot": S.optionalWith(UserResponse, { nullable: true }),
  "slug": S.optionalWith(S.String, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rpc_origins": S.optionalWith(S.Array(S.String), { nullable: true }),
  "bot_public": S.optionalWith(S.Boolean, { nullable: true }),
  "bot_require_code_grant": S.optionalWith(S.Boolean, { nullable: true }),
  "terms_of_service_url": S.optionalWith(S.String, { nullable: true }),
  "privacy_policy_url": S.optionalWith(S.String, { nullable: true }),
  "custom_install_url": S.optionalWith(S.String, { nullable: true }),
  "install_params": S.optionalWith(ApplicationOAuth2InstallParamsResponse, { nullable: true }),
  "integration_types_config": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "verify_key": S.String,
  "flags": S.Int,
  "max_participants": S.optionalWith(S.Int, { nullable: true }),
  "tags": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

export class AttachmentResponse extends S.Class<AttachmentResponse>("AttachmentResponse")({
  "id": SnowflakeType,
  "filename": S.String,
  "size": S.Int,
  "url": S.String,
  "proxy_url": S.String,
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "duration_secs": S.optionalWith(S.Number, { nullable: true }),
  "waveform": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "content_type": S.optionalWith(S.String, { nullable: true }),
  "ephemeral": S.optionalWith(S.Boolean, { nullable: true }),
  "title": S.optionalWith(S.String, { nullable: true }),
  "application": S.optionalWith(ApplicationResponse, { nullable: true }),
  "clip_created_at": S.optionalWith(S.String, { nullable: true }),
  "clip_participants": S.optionalWith(S.Array(UserResponse), { nullable: true })
}) {}

export class ActivitiesAttachmentResponse extends S.Class<ActivitiesAttachmentResponse>("ActivitiesAttachmentResponse")({
  "attachment": AttachmentResponse
}) {}

export class ListApplicationCommandsParams extends S.Struct({
  "with_localizations": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandType extends S.Union(/**
* Slash commands; a text-based command that shows up when a user types /
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class InteractionContextType extends S.Union(/**
* This command can be used within a Guild.
*/
S.Literal(0),
S.Literal(1),
S.Literal(2)) {}

export class ApplicationIntegrationType extends S.Union(/**
* For Guild install.
*/
S.Literal(0),
S.Literal(1)) {}

export class ApplicationCommandOptionType extends S.Union(/**
* A sub-action within a command or group
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7),
S.Literal(8),
S.Literal(9),
S.Literal(10),
S.Literal(11)) {}

export class ApplicationCommandAttachmentOptionResponse extends S.Class<ApplicationCommandAttachmentOptionResponse>("ApplicationCommandAttachmentOptionResponse")({
  "type": S.Literal(11),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandBooleanOptionResponse extends S.Class<ApplicationCommandBooleanOptionResponse>("ApplicationCommandBooleanOptionResponse")({
  "type": S.Literal(5),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ChannelTypes extends S.Union(/**
* A direct message between users
*/
S.Literal(1),
S.Literal(3),
S.Literal(0),
S.Literal(2),
S.Literal(4),
S.Literal(5),
S.Literal(10),
S.Literal(11),
S.Literal(12),
S.Literal(13),
S.Literal(14),
S.Literal(15)) {}

export class ApplicationCommandChannelOptionResponse extends S.Class<ApplicationCommandChannelOptionResponse>("ApplicationCommandChannelOptionResponse")({
  "type": S.Literal(7),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_types": S.optionalWith(S.Array(ChannelTypes), { nullable: true })
}) {}

export class ApplicationCommandOptionIntegerChoiceResponse extends S.Class<ApplicationCommandOptionIntegerChoiceResponse>("ApplicationCommandOptionIntegerChoiceResponse")({
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": Int53Type
}) {}

export class ApplicationCommandIntegerOptionResponse extends S.Class<ApplicationCommandIntegerOptionResponse>("ApplicationCommandIntegerOptionResponse")({
  "type": S.Literal(4),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionIntegerChoiceResponse), { nullable: true }),
  "min_value": S.optionalWith(Int53Type, { nullable: true }),
  "max_value": S.optionalWith(Int53Type, { nullable: true })
}) {}

export class ApplicationCommandMentionableOptionResponse extends S.Class<ApplicationCommandMentionableOptionResponse>("ApplicationCommandMentionableOptionResponse")({
  "type": S.Literal(9),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandOptionNumberChoiceResponse extends S.Class<ApplicationCommandOptionNumberChoiceResponse>("ApplicationCommandOptionNumberChoiceResponse")({
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": S.Number
}) {}

export class ApplicationCommandNumberOptionResponse extends S.Class<ApplicationCommandNumberOptionResponse>("ApplicationCommandNumberOptionResponse")({
  "type": S.Literal(10),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionNumberChoiceResponse), { nullable: true }),
  "min_value": S.optionalWith(S.Number, { nullable: true }),
  "max_value": S.optionalWith(S.Number, { nullable: true })
}) {}

export class ApplicationCommandRoleOptionResponse extends S.Class<ApplicationCommandRoleOptionResponse>("ApplicationCommandRoleOptionResponse")({
  "type": S.Literal(8),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandOptionStringChoiceResponse extends S.Class<ApplicationCommandOptionStringChoiceResponse>("ApplicationCommandOptionStringChoiceResponse")({
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": S.String
}) {}

export class ApplicationCommandStringOptionResponse extends S.Class<ApplicationCommandStringOptionResponse>("ApplicationCommandStringOptionResponse")({
  "type": S.Literal(3),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionStringChoiceResponse), { nullable: true }),
  "min_length": S.optionalWith(S.Int, { nullable: true }),
  "max_length": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ApplicationCommandUserOptionResponse extends S.Class<ApplicationCommandUserOptionResponse>("ApplicationCommandUserOptionResponse")({
  "type": S.Literal(6),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandSubcommandOptionResponse extends S.Class<ApplicationCommandSubcommandOptionResponse>("ApplicationCommandSubcommandOptionResponse")({
  "type": S.Literal(1),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOptionResponse,
ApplicationCommandBooleanOptionResponse,
ApplicationCommandChannelOptionResponse,
ApplicationCommandIntegerOptionResponse,
ApplicationCommandMentionableOptionResponse,
ApplicationCommandNumberOptionResponse,
ApplicationCommandRoleOptionResponse,
ApplicationCommandStringOptionResponse,
ApplicationCommandUserOptionResponse)), { nullable: true })
}) {}

export class ApplicationCommandSubcommandGroupOptionResponse extends S.Class<ApplicationCommandSubcommandGroupOptionResponse>("ApplicationCommandSubcommandGroupOptionResponse")({
  "type": S.Literal(2),
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.optionalWith(S.Array(ApplicationCommandSubcommandOptionResponse), { nullable: true })
}) {}

export class ApplicationCommandResponse extends S.Class<ApplicationCommandResponse>("ApplicationCommandResponse")({
  "id": SnowflakeType,
  "application_id": SnowflakeType,
  "version": SnowflakeType,
  "default_member_permissions": S.optionalWith(S.String, { nullable: true }),
  "type": ApplicationCommandType,
  "name": S.String,
  "name_localized": S.optionalWith(S.String, { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localized": S.optionalWith(S.String, { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "dm_permission": S.optionalWith(S.Boolean, { nullable: true }),
  "contexts": S.optionalWith(S.Array(InteractionContextType), { nullable: true }),
  "integration_types": S.optionalWith(S.Array(ApplicationIntegrationType), { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOptionResponse,
ApplicationCommandBooleanOptionResponse,
ApplicationCommandChannelOptionResponse,
ApplicationCommandIntegerOptionResponse,
ApplicationCommandMentionableOptionResponse,
ApplicationCommandNumberOptionResponse,
ApplicationCommandRoleOptionResponse,
ApplicationCommandStringOptionResponse,
ApplicationCommandSubcommandGroupOptionResponse,
ApplicationCommandSubcommandOptionResponse,
ApplicationCommandUserOptionResponse)), { nullable: true }),
  "nsfw": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListApplicationCommands200 extends S.Array(ApplicationCommandResponse) {}

export class ApplicationCommandAttachmentOption extends S.Class<ApplicationCommandAttachmentOption>("ApplicationCommandAttachmentOption")({
  "type": S.Literal(11),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandBooleanOption extends S.Class<ApplicationCommandBooleanOption>("ApplicationCommandBooleanOption")({
  "type": S.Literal(5),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandChannelOption extends S.Class<ApplicationCommandChannelOption>("ApplicationCommandChannelOption")({
  "type": S.Literal(7),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_types": S.optionalWith(S.Array(ChannelTypes), { nullable: true })
}) {}

export class ApplicationCommandOptionIntegerChoice extends S.Class<ApplicationCommandOptionIntegerChoice>("ApplicationCommandOptionIntegerChoice")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": Int53Type
}) {}

export class ApplicationCommandIntegerOption extends S.Class<ApplicationCommandIntegerOption>("ApplicationCommandIntegerOption")({
  "type": S.Literal(4),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionIntegerChoice).pipe(S.maxItems(25)), { nullable: true }),
  "min_value": S.optionalWith(Int53Type, { nullable: true }),
  "max_value": S.optionalWith(Int53Type, { nullable: true })
}) {}

export class ApplicationCommandMentionableOption extends S.Class<ApplicationCommandMentionableOption>("ApplicationCommandMentionableOption")({
  "type": S.Literal(9),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandOptionNumberChoice extends S.Class<ApplicationCommandOptionNumberChoice>("ApplicationCommandOptionNumberChoice")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": S.Number
}) {}

export class ApplicationCommandNumberOption extends S.Class<ApplicationCommandNumberOption>("ApplicationCommandNumberOption")({
  "type": S.Literal(10),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionNumberChoice).pipe(S.maxItems(25)), { nullable: true }),
  "min_value": S.optionalWith(S.Number, { nullable: true }),
  "max_value": S.optionalWith(S.Number, { nullable: true })
}) {}

export class ApplicationCommandRoleOption extends S.Class<ApplicationCommandRoleOption>("ApplicationCommandRoleOption")({
  "type": S.Literal(8),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandOptionStringChoice extends S.Class<ApplicationCommandOptionStringChoice>("ApplicationCommandOptionStringChoice")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "value": S.String.pipe(S.maxLength(6000))
}) {}

export class ApplicationCommandStringOption extends S.Class<ApplicationCommandStringOption>("ApplicationCommandStringOption")({
  "type": S.Literal(3),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "autocomplete": S.optionalWith(S.Boolean, { nullable: true }),
  "min_length": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(6000)), { nullable: true }),
  "max_length": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(6000)), { nullable: true }),
  "choices": S.optionalWith(S.Array(ApplicationCommandOptionStringChoice).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class ApplicationCommandUserOption extends S.Class<ApplicationCommandUserOption>("ApplicationCommandUserOption")({
  "type": S.Literal(6),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ApplicationCommandSubcommandOption extends S.Class<ApplicationCommandSubcommandOption>("ApplicationCommandSubcommandOption")({
  "type": S.Literal(1),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOption,
ApplicationCommandBooleanOption,
ApplicationCommandChannelOption,
ApplicationCommandIntegerOption,
ApplicationCommandMentionableOption,
ApplicationCommandNumberOption,
ApplicationCommandRoleOption,
ApplicationCommandStringOption,
ApplicationCommandUserOption)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class ApplicationCommandSubcommandGroupOption extends S.Class<ApplicationCommandSubcommandGroupOption>("ApplicationCommandSubcommandGroupOption")({
  "type": S.Literal(2),
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.optionalWith(S.Array(ApplicationCommandSubcommandOption).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class ApplicationCommandHandler extends S.Int {}

export class ApplicationCommandUpdateRequest extends S.Class<ApplicationCommandUpdateRequest>("ApplicationCommandUpdateRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOption,
ApplicationCommandBooleanOption,
ApplicationCommandChannelOption,
ApplicationCommandIntegerOption,
ApplicationCommandMentionableOption,
ApplicationCommandNumberOption,
ApplicationCommandRoleOption,
ApplicationCommandStringOption,
ApplicationCommandSubcommandGroupOption,
ApplicationCommandSubcommandOption,
ApplicationCommandUserOption)).pipe(S.maxItems(25)), { nullable: true }),
  "default_member_permissions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(9007199254740991)), { nullable: true }),
  "dm_permission": S.optionalWith(S.Boolean, { nullable: true }),
  "contexts": S.optionalWith(S.NonEmptyArray(InteractionContextType).pipe(S.minItems(1)), { nullable: true }),
  "integration_types": S.optionalWith(S.NonEmptyArray(ApplicationIntegrationType).pipe(S.minItems(1)), { nullable: true }),
  "handler": S.optionalWith(ApplicationCommandHandler, { nullable: true }),
  "type": S.optionalWith(ApplicationCommandType, { nullable: true }),
  "id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class BulkSetApplicationCommandsRequest extends S.Array(ApplicationCommandUpdateRequest).pipe(S.maxItems(110)) {}

export class BulkSetApplicationCommands200 extends S.Array(ApplicationCommandResponse) {}

export class ApplicationCommandCreateRequest extends S.Class<ApplicationCommandCreateRequest>("ApplicationCommandCreateRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(32)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOption,
ApplicationCommandBooleanOption,
ApplicationCommandChannelOption,
ApplicationCommandIntegerOption,
ApplicationCommandMentionableOption,
ApplicationCommandNumberOption,
ApplicationCommandRoleOption,
ApplicationCommandStringOption,
ApplicationCommandSubcommandGroupOption,
ApplicationCommandSubcommandOption,
ApplicationCommandUserOption)).pipe(S.maxItems(25)), { nullable: true }),
  "default_member_permissions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(9007199254740991)), { nullable: true }),
  "dm_permission": S.optionalWith(S.Boolean, { nullable: true }),
  "contexts": S.optionalWith(S.NonEmptyArray(InteractionContextType).pipe(S.minItems(1)), { nullable: true }),
  "integration_types": S.optionalWith(S.NonEmptyArray(ApplicationIntegrationType).pipe(S.minItems(1)), { nullable: true }),
  "handler": S.optionalWith(ApplicationCommandHandler, { nullable: true }),
  "type": S.optionalWith(ApplicationCommandType, { nullable: true })
}) {}

export class ApplicationCommandPatchRequestPartial extends S.Class<ApplicationCommandPatchRequestPartial>("ApplicationCommandPatchRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(32)), { nullable: true }),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "options": S.optionalWith(S.Array(S.Union(ApplicationCommandAttachmentOption,
ApplicationCommandBooleanOption,
ApplicationCommandChannelOption,
ApplicationCommandIntegerOption,
ApplicationCommandMentionableOption,
ApplicationCommandNumberOption,
ApplicationCommandRoleOption,
ApplicationCommandStringOption,
ApplicationCommandSubcommandGroupOption,
ApplicationCommandSubcommandOption,
ApplicationCommandUserOption)).pipe(S.maxItems(25)), { nullable: true }),
  "default_member_permissions": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(9007199254740991)), { nullable: true }),
  "dm_permission": S.optionalWith(S.Boolean, { nullable: true }),
  "contexts": S.optionalWith(S.NonEmptyArray(InteractionContextType).pipe(S.minItems(1)), { nullable: true }),
  "integration_types": S.optionalWith(S.NonEmptyArray(ApplicationIntegrationType).pipe(S.minItems(1)), { nullable: true }),
  "handler": S.optionalWith(ApplicationCommandHandler, { nullable: true })
}) {}

export class EmojiResponse extends S.Class<EmojiResponse>("EmojiResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "roles": S.Array(SnowflakeType),
  "require_colons": S.Boolean,
  "managed": S.Boolean,
  "animated": S.Boolean,
  "available": S.Boolean
}) {}

export class ListApplicationEmojisResponse extends S.Class<ListApplicationEmojisResponse>("ListApplicationEmojisResponse")({
  "items": S.Array(EmojiResponse)
}) {}

export class CreateApplicationEmojiRequest extends S.Class<CreateApplicationEmojiRequest>("CreateApplicationEmojiRequest")({
  "name": S.String.pipe(S.minLength(2), S.maxLength(32)),
  "image": S.String
}) {}

export class UpdateApplicationEmojiRequest extends S.Class<UpdateApplicationEmojiRequest>("UpdateApplicationEmojiRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(32)), { nullable: true })
}) {}

export class GetEntitlementsParams extends S.Struct({
  "user_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "sku_ids": S.optionalWith(S.Union(S.String,
S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(100))), { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true }),
  "exclude_ended": S.optionalWith(S.Boolean, { nullable: true }),
  "exclude_deleted": S.optionalWith(S.Boolean, { nullable: true }),
  "only_active": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class EntitlementTypes extends S.Union(S.Literal(8),
S.Literal(10)) {}

export class EntitlementTenantFulfillmentStatusResponse extends S.Union(S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7)) {}

export class EntitlementResponse extends S.Class<EntitlementResponse>("EntitlementResponse")({
  "id": SnowflakeType,
  "sku_id": SnowflakeType,
  "application_id": SnowflakeType,
  "user_id": SnowflakeType,
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "deleted": S.Boolean,
  "starts_at": S.optionalWith(S.String, { nullable: true }),
  "ends_at": S.optionalWith(S.String, { nullable: true }),
  "type": EntitlementTypes,
  "fulfilled_at": S.optionalWith(S.String, { nullable: true }),
  "fulfillment_status": S.optionalWith(EntitlementTenantFulfillmentStatusResponse, { nullable: true }),
  "consumed": S.optionalWith(S.Boolean, { nullable: true }),
  "gifter_user_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class GetEntitlements200 extends S.Array(S.Union(S.Null,
EntitlementResponse)) {}

export class EntitlementOwnerTypes extends S.Int {}

export class CreateEntitlementRequestData extends S.Class<CreateEntitlementRequestData>("CreateEntitlementRequestData")({
  "sku_id": SnowflakeType,
  "owner_id": SnowflakeType,
  "owner_type": EntitlementOwnerTypes
}) {}

export class ListGuildApplicationCommandsParams extends S.Struct({
  "with_localizations": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListGuildApplicationCommands200 extends S.Array(ApplicationCommandResponse) {}

export class BulkSetGuildApplicationCommandsRequest extends S.Array(ApplicationCommandUpdateRequest).pipe(S.maxItems(110)) {}

export class BulkSetGuildApplicationCommands200 extends S.Array(ApplicationCommandResponse) {}

export class ApplicationCommandPermissionType extends S.Union(/**
* This permission is for a role.
*/
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class CommandPermissionResponse extends S.Class<CommandPermissionResponse>("CommandPermissionResponse")({
  "id": SnowflakeType,
  "type": ApplicationCommandPermissionType,
  "permission": S.Boolean
}) {}

export class CommandPermissionsResponse extends S.Class<CommandPermissionsResponse>("CommandPermissionsResponse")({
  "id": SnowflakeType,
  "application_id": SnowflakeType,
  "guild_id": SnowflakeType,
  "permissions": S.Array(CommandPermissionResponse)
}) {}

export class ListGuildApplicationCommandPermissions200 extends S.Array(CommandPermissionsResponse) {}

export class ApplicationCommandPermission extends S.Class<ApplicationCommandPermission>("ApplicationCommandPermission")({
  "id": SnowflakeType,
  "type": ApplicationCommandPermissionType,
  "permission": S.Boolean
}) {}

export class SetGuildApplicationCommandPermissionsRequest extends S.Class<SetGuildApplicationCommandPermissionsRequest>("SetGuildApplicationCommandPermissionsRequest")({
  "permissions": S.optionalWith(S.Array(ApplicationCommandPermission).pipe(S.maxItems(100)), { nullable: true })
}) {}

export class MetadataItemTypes extends S.Union(/**
* the metadata value (integer) is less than or equal to the guild's configured value (integer)
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7),
S.Literal(8)) {}

export class ApplicationRoleConnectionsMetadataItemResponse extends S.Class<ApplicationRoleConnectionsMetadataItemResponse>("ApplicationRoleConnectionsMetadataItemResponse")({
  "type": MetadataItemTypes,
  "key": S.String,
  "name": S.String,
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String,
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class GetApplicationRoleConnectionsMetadata200 extends S.Array(ApplicationRoleConnectionsMetadataItemResponse) {}

export class ApplicationRoleConnectionsMetadataItemRequest extends S.Class<ApplicationRoleConnectionsMetadataItemRequest>("ApplicationRoleConnectionsMetadataItemRequest")({
  "type": MetadataItemTypes,
  "key": S.String.pipe(S.minLength(1), S.maxLength(50)),
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "name_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "description": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "description_localizations": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class UpdateApplicationRoleConnectionsMetadataRequest extends S.Array(ApplicationRoleConnectionsMetadataItemRequest).pipe(S.maxItems(5)) {}

export class UpdateApplicationRoleConnectionsMetadata200 extends S.Array(ApplicationRoleConnectionsMetadataItemResponse) {}

export class VideoQualityModes extends S.Union(/**
* Discord chooses the quality for optimal performance
*/
S.Literal(1),
S.Literal(2)) {}

export class ThreadAutoArchiveDuration extends S.Union(/**
* One hour
*/
S.Literal(60),
S.Literal(1440),
S.Literal(4320),
S.Literal(10080)) {}

export class ChannelPermissionOverwrites extends S.Union(S.Literal(0),
S.Literal(1)) {}

export class ChannelPermissionOverwriteResponse extends S.Class<ChannelPermissionOverwriteResponse>("ChannelPermissionOverwriteResponse")({
  "id": SnowflakeType,
  "type": ChannelPermissionOverwrites,
  "allow": S.String,
  "deny": S.String
}) {}

export class ForumTagResponse extends S.Class<ForumTagResponse>("ForumTagResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "moderated": S.Boolean,
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String, { nullable: true })
}) {}

export class DefaultReactionEmojiResponse extends S.Class<DefaultReactionEmojiResponse>("DefaultReactionEmojiResponse")({
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String, { nullable: true })
}) {}

export class ThreadSortOrder extends S.Union(/**
* Sort forum posts by activity
*/
S.Literal(0),
S.Literal(1)) {}

export class ForumLayout extends S.Union(/**
* No default has been set for forum channel
*/
S.Literal(0),
S.Literal(1),
S.Literal(2)) {}

export class ThreadSearchTagSetting extends S.Union(/**
* The thread tags must contain all tags in the search query
*/
S.Literal("match_all"),
S.Literal("match_some")) {}

export class GuildChannelResponse extends S.Class<GuildChannelResponse>("GuildChannelResponse")({
  "id": SnowflakeType,
  "type": S.Literal(0, 2, 4, 5, 13, 14, 15),
  "last_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.Int,
  "last_pin_timestamp": S.optionalWith(S.String, { nullable: true }),
  "guild_id": SnowflakeType,
  "name": S.String,
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int, { nullable: true }),
  "bitrate": S.optionalWith(S.Int, { nullable: true }),
  "user_limit": S.optionalWith(S.Int, { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true }),
  "permissions": S.optionalWith(S.String, { nullable: true }),
  "topic": S.optionalWith(S.String, { nullable: true }),
  "default_auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "default_thread_rate_limit_per_user": S.optionalWith(S.Int, { nullable: true }),
  "position": S.Int,
  "permission_overwrites": S.optionalWith(S.Array(ChannelPermissionOverwriteResponse), { nullable: true }),
  "nsfw": S.optionalWith(S.Boolean, { nullable: true }),
  "available_tags": S.optionalWith(S.Array(ForumTagResponse), { nullable: true }),
  "default_reaction_emoji": S.optionalWith(DefaultReactionEmojiResponse, { nullable: true }),
  "default_sort_order": S.optionalWith(ThreadSortOrder, { nullable: true }),
  "default_forum_layout": S.optionalWith(ForumLayout, { nullable: true }),
  "default_tag_setting": S.optionalWith(ThreadSearchTagSetting, { nullable: true }),
  "hd_streaming_until": S.optionalWith(S.String, { nullable: true }),
  "hd_streaming_buyer_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class PrivateChannelResponse extends S.Class<PrivateChannelResponse>("PrivateChannelResponse")({
  "id": SnowflakeType,
  "type": S.Literal(1),
  "last_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.Int,
  "last_pin_timestamp": S.optionalWith(S.String, { nullable: true }),
  "recipients": S.Array(UserResponse)
}) {}

export class PrivateGroupChannelResponse extends S.Class<PrivateGroupChannelResponse>("PrivateGroupChannelResponse")({
  "id": SnowflakeType,
  "type": S.Literal(3),
  "last_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.Int,
  "last_pin_timestamp": S.optionalWith(S.String, { nullable: true }),
  "recipients": S.Array(UserResponse),
  "name": S.optionalWith(S.String, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "owner_id": SnowflakeType,
  "managed": S.optionalWith(S.Boolean, { nullable: true }),
  "application_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class ThreadMetadataResponse extends S.Class<ThreadMetadataResponse>("ThreadMetadataResponse")({
  "archived": S.Boolean,
  "archive_timestamp": S.optionalWith(S.String, { nullable: true }),
  "auto_archive_duration": ThreadAutoArchiveDuration,
  "locked": S.Boolean,
  "create_timestamp": S.optionalWith(S.String, { nullable: true }),
  "invitable": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GuildMemberResponse extends S.Class<GuildMemberResponse>("GuildMemberResponse")({
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "avatar_decoration_data": S.optionalWith(UserAvatarDecorationResponse, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "communication_disabled_until": S.optionalWith(S.String, { nullable: true }),
  "flags": S.Int,
  "joined_at": S.String,
  "nick": S.optionalWith(S.String, { nullable: true }),
  "pending": S.Boolean,
  "premium_since": S.optionalWith(S.String, { nullable: true }),
  "roles": S.Array(SnowflakeType),
  "collectibles": S.optionalWith(UserCollectiblesResponse, { nullable: true }),
  "user": UserResponse,
  "mute": S.Boolean,
  "deaf": S.Boolean
}) {}

export class ThreadMemberResponse extends S.Class<ThreadMemberResponse>("ThreadMemberResponse")({
  "id": SnowflakeType,
  "user_id": SnowflakeType,
  "join_timestamp": S.String,
  "flags": S.Int,
  "member": S.optionalWith(GuildMemberResponse, { nullable: true })
}) {}

export class ThreadResponse extends S.Class<ThreadResponse>("ThreadResponse")({
  "id": SnowflakeType,
  "type": S.Literal(10, 11, 12),
  "last_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.Int,
  "last_pin_timestamp": S.optionalWith(S.String, { nullable: true }),
  "guild_id": SnowflakeType,
  "name": S.String,
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int, { nullable: true }),
  "bitrate": S.optionalWith(S.Int, { nullable: true }),
  "user_limit": S.optionalWith(S.Int, { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true }),
  "permissions": S.optionalWith(S.String, { nullable: true }),
  "owner_id": SnowflakeType,
  "thread_metadata": ThreadMetadataResponse,
  "message_count": S.Int,
  "member_count": S.Int,
  "total_message_sent": S.Int,
  "applied_tags": S.optionalWith(S.Array(SnowflakeType), { nullable: true }),
  "member": S.optionalWith(ThreadMemberResponse, { nullable: true })
}) {}

export class GetChannel200 extends S.Union(GuildChannelResponse,
PrivateChannelResponse,
PrivateGroupChannelResponse,
ThreadResponse) {}

export class DeleteChannel200 extends S.Union(GuildChannelResponse,
PrivateChannelResponse,
PrivateGroupChannelResponse,
ThreadResponse) {}

export class UpdateDMRequestPartial extends S.Class<UpdateDMRequestPartial>("UpdateDMRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(100)), { nullable: true })
}) {}

export class UpdateGroupDMRequestPartial extends S.Class<UpdateGroupDMRequestPartial>("UpdateGroupDMRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(100)), { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true })
}) {}

export class ChannelPermissionOverwriteRequest extends S.Class<ChannelPermissionOverwriteRequest>("ChannelPermissionOverwriteRequest")({
  "id": SnowflakeType,
  "type": S.optionalWith(ChannelPermissionOverwrites, { nullable: true }),
  "allow": S.optionalWith(S.Int, { nullable: true }),
  "deny": S.optionalWith(S.Int, { nullable: true })
}) {}

export class UpdateDefaultReactionEmojiRequest extends S.Class<UpdateDefaultReactionEmojiRequest>("UpdateDefaultReactionEmojiRequest")({
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true })
}) {}

export class UpdateThreadTagRequest extends S.Class<UpdateThreadTagRequest>("UpdateThreadTagRequest")({
  "name": S.String.pipe(S.minLength(0), S.maxLength(50)),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "moderated": S.optionalWith(S.Boolean, { nullable: true }),
  "id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateGuildChannelRequestPartial extends S.Class<UpdateGuildChannelRequestPartial>("UpdateGuildChannelRequestPartial")({
  "type": S.optionalWith(S.Literal(0, 2, 4, 5, 13, 14, 15), { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(100)), { nullable: true }),
  "position": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "topic": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(4096)), { nullable: true }),
  "bitrate": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(8000)), { nullable: true }),
  "user_limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "nsfw": S.optionalWith(S.Boolean, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "permission_overwrites": S.optionalWith(S.Array(ChannelPermissionOverwriteRequest).pipe(S.maxItems(100)), { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true }),
  "default_auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "default_reaction_emoji": S.optionalWith(UpdateDefaultReactionEmojiRequest, { nullable: true }),
  "default_thread_rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "default_sort_order": S.optionalWith(ThreadSortOrder, { nullable: true }),
  "default_forum_layout": S.optionalWith(ForumLayout, { nullable: true }),
  "default_tag_setting": S.optionalWith(ThreadSearchTagSetting, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "available_tags": S.optionalWith(S.Array(UpdateThreadTagRequest).pipe(S.maxItems(20)), { nullable: true })
}) {}

export class UpdateThreadRequestPartial extends S.Class<UpdateThreadRequestPartial>("UpdateThreadRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(100)), { nullable: true }),
  "archived": S.optionalWith(S.Boolean, { nullable: true }),
  "locked": S.optionalWith(S.Boolean, { nullable: true }),
  "invitable": S.optionalWith(S.Boolean, { nullable: true }),
  "auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "applied_tags": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(5)), { nullable: true }),
  "bitrate": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(8000)), { nullable: true }),
  "user_limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(99)), { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true })
}) {}

export class UpdateChannelRequest extends S.Union(UpdateDMRequestPartial,
UpdateGroupDMRequestPartial,
UpdateGuildChannelRequestPartial,
UpdateThreadRequestPartial) {}

export class UpdateChannel200 extends S.Union(GuildChannelResponse,
PrivateChannelResponse,
PrivateGroupChannelResponse,
ThreadResponse) {}

export class FollowChannelRequest extends S.Class<FollowChannelRequest>("FollowChannelRequest")({
  "webhook_channel_id": SnowflakeType
}) {}

export class ChannelFollowerResponse extends S.Class<ChannelFollowerResponse>("ChannelFollowerResponse")({
  "channel_id": SnowflakeType,
  "webhook_id": SnowflakeType
}) {}

export class InviteTypes extends S.Union(S.Literal(0),
S.Literal(1),
S.Literal(2)) {}

export class InviteChannelRecipientResponse extends S.Class<InviteChannelRecipientResponse>("InviteChannelRecipientResponse")({
  "username": S.String
}) {}

export class InviteChannelResponse extends S.Class<InviteChannelResponse>("InviteChannelResponse")({
  "id": SnowflakeType,
  "type": ChannelTypes,
  "name": S.optionalWith(S.String, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "recipients": S.optionalWith(S.Array(InviteChannelRecipientResponse), { nullable: true })
}) {}

export class FriendInviteResponse extends S.Class<FriendInviteResponse>("FriendInviteResponse")({
  "type": S.Literal(2),
  "code": S.String,
  "inviter": S.optionalWith(UserResponse, { nullable: true }),
  "max_age": S.optionalWith(S.Int, { nullable: true }),
  "created_at": S.optionalWith(S.String, { nullable: true }),
  "expires_at": S.optionalWith(S.String, { nullable: true }),
  "friends_count": S.optionalWith(S.Int, { nullable: true }),
  "channel": S.optionalWith(InviteChannelResponse, { nullable: true }),
  "is_contact": S.optionalWith(S.Boolean, { nullable: true }),
  "uses": S.optionalWith(S.Int, { nullable: true }),
  "max_uses": S.optionalWith(S.Int, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GroupDMInviteResponse extends S.Class<GroupDMInviteResponse>("GroupDMInviteResponse")({
  "type": S.Literal(1),
  "code": S.String,
  "inviter": S.optionalWith(UserResponse, { nullable: true }),
  "max_age": S.optionalWith(S.Int, { nullable: true }),
  "created_at": S.optionalWith(S.String, { nullable: true }),
  "expires_at": S.optionalWith(S.String, { nullable: true }),
  "channel": InviteChannelResponse,
  "approximate_member_count": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GuildFeatures extends S.String {}

export class VerificationLevels extends S.Union(/**
* unrestricted
*/
S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class GuildNSFWContentLevel extends S.Union(S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class InviteGuildResponse extends S.Class<InviteGuildResponse>("InviteGuildResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "splash": S.optionalWith(S.String, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "features": S.Array(GuildFeatures),
  "verification_level": S.optionalWith(VerificationLevels, { nullable: true }),
  "vanity_url_code": S.optionalWith(S.String, { nullable: true }),
  "nsfw_level": S.optionalWith(GuildNSFWContentLevel, { nullable: true }),
  "nsfw": S.optionalWith(S.Boolean, { nullable: true }),
  "premium_subscription_count": S.Int
}) {}

export class InviteTargetTypes extends S.Union(S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class InviteApplicationResponse extends S.Class<InviteApplicationResponse>("InviteApplicationResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String,
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "primary_sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "bot": S.optionalWith(UserResponse, { nullable: true }),
  "slug": S.optionalWith(S.String, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rpc_origins": S.optionalWith(S.Array(S.String), { nullable: true }),
  "bot_public": S.optionalWith(S.Boolean, { nullable: true }),
  "bot_require_code_grant": S.optionalWith(S.Boolean, { nullable: true }),
  "terms_of_service_url": S.optionalWith(S.String, { nullable: true }),
  "privacy_policy_url": S.optionalWith(S.String, { nullable: true }),
  "custom_install_url": S.optionalWith(S.String, { nullable: true }),
  "install_params": S.optionalWith(ApplicationOAuth2InstallParamsResponse, { nullable: true }),
  "integration_types_config": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "verify_key": S.String,
  "flags": S.Int,
  "max_participants": S.optionalWith(S.Int, { nullable: true }),
  "tags": S.optionalWith(S.Array(S.String), { nullable: true })
}) {}

export class GuildScheduledEventStatuses extends S.Union(S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class GuildScheduledEventEntityTypes extends S.Union(S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class GuildScheduledEventPrivacyLevels extends S.Literal(2) {}

export class ScheduledEventUserResponse extends S.Class<ScheduledEventUserResponse>("ScheduledEventUserResponse")({
  "guild_scheduled_event_id": SnowflakeType,
  "user_id": SnowflakeType,
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "member": S.optionalWith(GuildMemberResponse, { nullable: true })
}) {}

export class ScheduledEventResponse extends S.Class<ScheduledEventResponse>("ScheduledEventResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator": S.optionalWith(UserResponse, { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "status": GuildScheduledEventStatuses,
  "entity_type": GuildScheduledEventEntityTypes,
  "entity_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "user_count": S.optionalWith(S.Int, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "user_rsvp": S.optionalWith(ScheduledEventUserResponse, { nullable: true })
}) {}

export class GuildInviteResponse extends S.Class<GuildInviteResponse>("GuildInviteResponse")({
  "type": S.Literal(0),
  "code": S.String,
  "inviter": S.optionalWith(UserResponse, { nullable: true }),
  "max_age": S.optionalWith(S.Int, { nullable: true }),
  "created_at": S.optionalWith(S.String, { nullable: true }),
  "expires_at": S.optionalWith(S.String, { nullable: true }),
  "is_contact": S.optionalWith(S.Boolean, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "guild": InviteGuildResponse,
  "guild_id": SnowflakeType,
  "channel": InviteChannelResponse,
  "target_type": S.optionalWith(InviteTargetTypes, { nullable: true }),
  "target_user": S.optionalWith(UserResponse, { nullable: true }),
  "target_application": S.optionalWith(InviteApplicationResponse, { nullable: true }),
  "guild_scheduled_event": S.optionalWith(ScheduledEventResponse, { nullable: true }),
  "uses": S.optionalWith(S.Int, { nullable: true }),
  "max_uses": S.optionalWith(S.Int, { nullable: true }),
  "temporary": S.optionalWith(S.Boolean, { nullable: true }),
  "approximate_member_count": S.optionalWith(S.Int, { nullable: true }),
  "approximate_presence_count": S.optionalWith(S.Int, { nullable: true }),
  "is_nickname_changeable": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListChannelInvites200 extends S.Array(S.Union(FriendInviteResponse,
GroupDMInviteResponse,
GuildInviteResponse,
S.Null)) {}

export class CreateGroupDMInviteRequest extends S.Class<CreateGroupDMInviteRequest>("CreateGroupDMInviteRequest")({
  "max_age": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(604800)), { nullable: true })
}) {}

export class CreateGuildInviteRequest extends S.Class<CreateGuildInviteRequest>("CreateGuildInviteRequest")({
  "max_age": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5184000)), { nullable: true }),
  "temporary": S.optionalWith(S.Boolean, { nullable: true }),
  "max_uses": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), { nullable: true }),
  "unique": S.optionalWith(S.Boolean, { nullable: true }),
  "target_user_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "target_application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "target_type": S.optionalWith(S.Literal(1, 2), { nullable: true })
}) {}

export class CreateChannelInviteRequest extends S.Union(CreateGroupDMInviteRequest,
CreateGuildInviteRequest) {}

export class CreateChannelInvite200 extends S.Union(FriendInviteResponse,
GroupDMInviteResponse,
GuildInviteResponse) {}

export class ListMessagesParams extends S.Struct({
  "around": S.optionalWith(SnowflakeType, { nullable: true }),
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class MessageType extends S.Union(S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7),
S.Literal(8),
S.Literal(9),
S.Literal(10),
S.Literal(11),
S.Literal(12),
S.Literal(14),
S.Literal(15),
S.Literal(16),
S.Literal(17),
S.Literal(18),
S.Literal(19),
S.Literal(20),
S.Literal(21),
S.Literal(22),
S.Literal(23),
S.Literal(24),
S.Literal(25),
S.Literal(26),
S.Literal(27),
S.Literal(28),
S.Literal(29),
S.Literal(31),
S.Literal(32),
S.Literal(36),
S.Literal(37),
S.Literal(38),
S.Literal(39),
S.Literal(46),
S.Literal(55)) {}

export class MessageAttachmentResponse extends S.Class<MessageAttachmentResponse>("MessageAttachmentResponse")({
  "id": SnowflakeType,
  "filename": S.String,
  "size": S.Int,
  "url": S.String,
  "proxy_url": S.String,
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "duration_secs": S.optionalWith(S.Number, { nullable: true }),
  "waveform": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "content_type": S.optionalWith(S.String, { nullable: true }),
  "ephemeral": S.optionalWith(S.Boolean, { nullable: true }),
  "title": S.optionalWith(S.String, { nullable: true }),
  "application": S.optionalWith(ApplicationResponse, { nullable: true }),
  "clip_created_at": S.optionalWith(S.String, { nullable: true }),
  "clip_participants": S.optionalWith(S.Array(UserResponse), { nullable: true })
}) {}

export class MessageEmbedFieldResponse extends S.Class<MessageEmbedFieldResponse>("MessageEmbedFieldResponse")({
  "name": S.String,
  "value": S.String,
  "inline": S.Boolean
}) {}

export class MessageEmbedAuthorResponse extends S.Class<MessageEmbedAuthorResponse>("MessageEmbedAuthorResponse")({
  "name": S.String,
  "url": S.optionalWith(S.String, { nullable: true }),
  "icon_url": S.optionalWith(S.String, { nullable: true }),
  "proxy_icon_url": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageEmbedProviderResponse extends S.Class<MessageEmbedProviderResponse>("MessageEmbedProviderResponse")({
  "name": S.String,
  "url": S.optionalWith(S.String, { nullable: true })
}) {}

export class UInt32Type extends S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(4294967295)) {}

export class MessageEmbedImageResponse extends S.Class<MessageEmbedImageResponse>("MessageEmbedImageResponse")({
  "url": S.optionalWith(S.String, { nullable: true }),
  "proxy_url": S.optionalWith(S.String, { nullable: true }),
  "width": S.optionalWith(UInt32Type, { nullable: true }),
  "height": S.optionalWith(UInt32Type, { nullable: true }),
  "content_type": S.optionalWith(S.String, { nullable: true }),
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "placeholder_version": S.optionalWith(UInt32Type, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "flags": S.optionalWith(UInt32Type, { nullable: true })
}) {}

export class MessageEmbedVideoResponse extends S.Class<MessageEmbedVideoResponse>("MessageEmbedVideoResponse")({
  "url": S.optionalWith(S.String, { nullable: true }),
  "proxy_url": S.optionalWith(S.String, { nullable: true }),
  "width": S.optionalWith(UInt32Type, { nullable: true }),
  "height": S.optionalWith(UInt32Type, { nullable: true }),
  "content_type": S.optionalWith(S.String, { nullable: true }),
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "placeholder_version": S.optionalWith(UInt32Type, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "flags": S.optionalWith(UInt32Type, { nullable: true })
}) {}

export class MessageEmbedFooterResponse extends S.Class<MessageEmbedFooterResponse>("MessageEmbedFooterResponse")({
  "text": S.String,
  "icon_url": S.optionalWith(S.String, { nullable: true }),
  "proxy_icon_url": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageEmbedResponse extends S.Class<MessageEmbedResponse>("MessageEmbedResponse")({
  "type": S.String,
  "url": S.optionalWith(S.String, { nullable: true }),
  "title": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "color": S.optionalWith(S.Int, { nullable: true }),
  "timestamp": S.optionalWith(S.String, { nullable: true }),
  "fields": S.optionalWith(S.Array(MessageEmbedFieldResponse), { nullable: true }),
  "author": S.optionalWith(MessageEmbedAuthorResponse, { nullable: true }),
  "provider": S.optionalWith(MessageEmbedProviderResponse, { nullable: true }),
  "image": S.optionalWith(MessageEmbedImageResponse, { nullable: true }),
  "thumbnail": S.optionalWith(MessageEmbedImageResponse, { nullable: true }),
  "video": S.optionalWith(MessageEmbedVideoResponse, { nullable: true }),
  "footer": S.optionalWith(MessageEmbedFooterResponse, { nullable: true })
}) {}

export class MessageComponentTypes extends S.Union(/**
* Container for other components
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7),
S.Literal(8),
S.Literal(9),
S.Literal(10),
S.Literal(11),
S.Literal(12),
S.Literal(13),
S.Literal(14),
S.Literal(17),
S.Literal(18),
S.Literal(19)) {}

export class ButtonStyleTypes extends S.Union(S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5),
S.Literal(6)) {}

export class ComponentEmojiResponse extends S.Class<ComponentEmojiResponse>("ComponentEmojiResponse")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.String,
  "animated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ButtonComponentResponse extends S.Class<ButtonComponentResponse>("ButtonComponentResponse")({
  "type": S.Literal(2),
  "id": S.Int,
  "custom_id": S.optionalWith(S.String, { nullable: true }),
  "style": ButtonStyleTypes,
  "label": S.optionalWith(S.String, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "emoji": S.optionalWith(ComponentEmojiResponse, { nullable: true }),
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "sku_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class SnowflakeSelectDefaultValueTypes extends S.Union(S.Literal("user"),
S.Literal("role"),
S.Literal("channel")) {}

export class ChannelSelectDefaultValueResponse extends S.Class<ChannelSelectDefaultValueResponse>("ChannelSelectDefaultValueResponse")({
  "type": S.Literal("channel"),
  "id": SnowflakeType
}) {}

export class ChannelSelectComponentResponse extends S.Class<ChannelSelectComponentResponse>("ChannelSelectComponentResponse")({
  "type": S.Literal(8),
  "id": S.Int,
  "custom_id": S.String,
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "min_values": S.optionalWith(S.Int, { nullable: true }),
  "max_values": S.optionalWith(S.Int, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_types": S.optionalWith(S.Array(ChannelTypes), { nullable: true }),
  "default_values": S.optionalWith(S.Array(ChannelSelectDefaultValueResponse), { nullable: true })
}) {}

export class RoleSelectDefaultValueResponse extends S.Class<RoleSelectDefaultValueResponse>("RoleSelectDefaultValueResponse")({
  "type": S.Literal("role"),
  "id": SnowflakeType
}) {}

export class UserSelectDefaultValueResponse extends S.Class<UserSelectDefaultValueResponse>("UserSelectDefaultValueResponse")({
  "type": S.Literal("user"),
  "id": SnowflakeType
}) {}

export class MentionableSelectComponentResponse extends S.Class<MentionableSelectComponentResponse>("MentionableSelectComponentResponse")({
  "type": S.Literal(7),
  "id": S.Int,
  "custom_id": S.String,
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "min_values": S.optionalWith(S.Int, { nullable: true }),
  "max_values": S.optionalWith(S.Int, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(S.Union(RoleSelectDefaultValueResponse,
UserSelectDefaultValueResponse)), { nullable: true })
}) {}

export class RoleSelectComponentResponse extends S.Class<RoleSelectComponentResponse>("RoleSelectComponentResponse")({
  "type": S.Literal(6),
  "id": S.Int,
  "custom_id": S.String,
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "min_values": S.optionalWith(S.Int, { nullable: true }),
  "max_values": S.optionalWith(S.Int, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(RoleSelectDefaultValueResponse), { nullable: true })
}) {}

export class StringSelectOptionResponse extends S.Class<StringSelectOptionResponse>("StringSelectOptionResponse")({
  "label": S.String,
  "value": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "emoji": S.optionalWith(ComponentEmojiResponse, { nullable: true }),
  "default": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class StringSelectComponentResponse extends S.Class<StringSelectComponentResponse>("StringSelectComponentResponse")({
  "type": S.Literal(3),
  "id": S.Int,
  "custom_id": S.String,
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "min_values": S.optionalWith(S.Int, { nullable: true }),
  "max_values": S.optionalWith(S.Int, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.Array(StringSelectOptionResponse)
}) {}

export class TextInputStyleTypes extends S.Union(/**
* Single-line input
*/
S.Literal(1),
S.Literal(2)) {}

export class TextInputComponentResponse extends S.Class<TextInputComponentResponse>("TextInputComponentResponse")({
  "type": S.Literal(4),
  "id": S.Int,
  "custom_id": S.String,
  "style": TextInputStyleTypes,
  "label": S.optionalWith(S.String, { nullable: true }),
  "value": S.optionalWith(S.String, { nullable: true }),
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "min_length": S.optionalWith(S.Int, { nullable: true }),
  "max_length": S.optionalWith(S.Int, { nullable: true })
}) {}

export class UserSelectComponentResponse extends S.Class<UserSelectComponentResponse>("UserSelectComponentResponse")({
  "type": S.Literal(5),
  "id": S.Int,
  "custom_id": S.String,
  "placeholder": S.optionalWith(S.String, { nullable: true }),
  "min_values": S.optionalWith(S.Int, { nullable: true }),
  "max_values": S.optionalWith(S.Int, { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(UserSelectDefaultValueResponse), { nullable: true })
}) {}

export class ActionRowComponentResponse extends S.Class<ActionRowComponentResponse>("ActionRowComponentResponse")({
  "type": S.Literal(1),
  "id": S.Int,
  "components": S.Array(S.Union(ButtonComponentResponse,
ChannelSelectComponentResponse,
MentionableSelectComponentResponse,
RoleSelectComponentResponse,
StringSelectComponentResponse,
TextInputComponentResponse,
UserSelectComponentResponse))
}) {}

export class UnfurledMediaResponse extends S.Class<UnfurledMediaResponse>("UnfurledMediaResponse")({
  "id": SnowflakeType,
  "url": S.String,
  "proxy_url": S.String,
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "content_type": S.optionalWith(S.String, { nullable: true }),
  "attachment_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class FileComponentResponse extends S.Class<FileComponentResponse>("FileComponentResponse")({
  "type": S.Literal(13),
  "id": S.Int,
  "file": UnfurledMediaResponse,
  "name": S.optionalWith(S.String, { nullable: true }),
  "size": S.optionalWith(S.Int, { nullable: true }),
  "spoiler": S.Boolean
}) {}

export class MediaGalleryItemResponse extends S.Class<MediaGalleryItemResponse>("MediaGalleryItemResponse")({
  "media": UnfurledMediaResponse,
  "description": S.optionalWith(S.String, { nullable: true }),
  "spoiler": S.Boolean
}) {}

export class MediaGalleryComponentResponse extends S.Class<MediaGalleryComponentResponse>("MediaGalleryComponentResponse")({
  "type": S.Literal(12),
  "id": S.Int,
  "items": S.Array(MediaGalleryItemResponse)
}) {}

export class TextDisplayComponentResponse extends S.Class<TextDisplayComponentResponse>("TextDisplayComponentResponse")({
  "type": S.Literal(10),
  "id": S.Int,
  "content": S.String
}) {}

export class ThumbnailComponentResponse extends S.Class<ThumbnailComponentResponse>("ThumbnailComponentResponse")({
  "type": S.Literal(11),
  "id": S.Int,
  "media": UnfurledMediaResponse,
  "description": S.optionalWith(S.String, { nullable: true }),
  "spoiler": S.Boolean
}) {}

export class SectionComponentResponse extends S.Class<SectionComponentResponse>("SectionComponentResponse")({
  "type": S.Literal(9),
  "id": S.Int,
  "components": S.Array(TextDisplayComponentResponse),
  "accessory": S.Union(ButtonComponentResponse,
ThumbnailComponentResponse)
}) {}

export class MessageComponentSeparatorSpacingSize extends S.Union(/**
* Small spacing
*/
S.Literal(1),
S.Literal(2)) {}

export class SeparatorComponentResponse extends S.Class<SeparatorComponentResponse>("SeparatorComponentResponse")({
  "type": S.Literal(14),
  "id": S.Int,
  "spacing": MessageComponentSeparatorSpacingSize,
  "divider": S.Boolean
}) {}

export class ContainerComponentResponse extends S.Class<ContainerComponentResponse>("ContainerComponentResponse")({
  "type": S.Literal(17),
  "id": S.Int,
  "accent_color": S.optionalWith(S.Int, { nullable: true }),
  "components": S.Array(S.Union(ActionRowComponentResponse,
FileComponentResponse,
MediaGalleryComponentResponse,
SectionComponentResponse,
SeparatorComponentResponse,
TextDisplayComponentResponse)),
  "spoiler": S.Boolean
}) {}

export class StickerTypes extends S.Union(/**
* an official sticker in a pack, part of Nitro or in a removed purchasable pack
*/
S.Literal(1),
S.Literal(2)) {}

export class StickerFormatTypes extends S.Union(S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class GuildStickerResponse extends S.Class<GuildStickerResponse>("GuildStickerResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "tags": S.String,
  "type": S.Literal(2),
  "format_type": S.optionalWith(StickerFormatTypes, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "available": S.Boolean,
  "guild_id": SnowflakeType,
  "user": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class StandardStickerResponse extends S.Class<StandardStickerResponse>("StandardStickerResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "tags": S.String,
  "type": S.Literal(1),
  "format_type": S.optionalWith(StickerFormatTypes, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "pack_id": SnowflakeType,
  "sort_value": S.Int
}) {}

export class MessageStickerItemResponse extends S.Class<MessageStickerItemResponse>("MessageStickerItemResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "format_type": StickerFormatTypes
}) {}

export class MessageCallResponse extends S.Class<MessageCallResponse>("MessageCallResponse")({
  "ended_timestamp": S.optionalWith(S.String, { nullable: true }),
  "participants": S.Array(SnowflakeType)
}) {}

export class MessageActivityResponse extends S.Class<MessageActivityResponse>("MessageActivityResponse")({
  
}) {}

export class BasicApplicationResponse extends S.Class<BasicApplicationResponse>("BasicApplicationResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String,
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "primary_sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "bot": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class InteractionTypes extends S.Union(/**
* Sent by Discord to validate your application's interaction handler
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5)) {}

export class MessageInteractionResponse extends S.Class<MessageInteractionResponse>("MessageInteractionResponse")({
  "id": SnowflakeType,
  "type": InteractionTypes,
  "name": S.String,
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "name_localized": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageReferenceType extends S.Literal(0) {}

export class MessageReferenceResponse extends S.Class<MessageReferenceResponse>("MessageReferenceResponse")({
  "type": MessageReferenceType,
  "channel_id": SnowflakeType,
  "message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class MessageMentionChannelResponse extends S.Class<MessageMentionChannelResponse>("MessageMentionChannelResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "type": ChannelTypes,
  "guild_id": SnowflakeType
}) {}

export class MessageRoleSubscriptionDataResponse extends S.Class<MessageRoleSubscriptionDataResponse>("MessageRoleSubscriptionDataResponse")({
  "role_subscription_listing_id": SnowflakeType,
  "tier_name": S.String,
  "total_months_subscribed": S.Int,
  "is_renewal": S.Boolean
}) {}

export class PurchaseType extends S.Literal(0) {}

export class GuildProductPurchaseResponse extends S.Class<GuildProductPurchaseResponse>("GuildProductPurchaseResponse")({
  "listing_id": SnowflakeType,
  "product_name": S.String
}) {}

export class PurchaseNotificationResponse extends S.Class<PurchaseNotificationResponse>("PurchaseNotificationResponse")({
  "type": PurchaseType,
  "guild_product_purchase": S.optionalWith(GuildProductPurchaseResponse, { nullable: true })
}) {}

export class ResolvedObjectsResponse extends S.Class<ResolvedObjectsResponse>("ResolvedObjectsResponse")({
  "users": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "members": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "channels": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "roles": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class MessageReactionEmojiResponse extends S.Class<MessageReactionEmojiResponse>("MessageReactionEmojiResponse")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "animated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class PollMediaResponse extends S.Class<PollMediaResponse>("PollMediaResponse")({
  "text": S.optionalWith(S.String, { nullable: true }),
  "emoji": S.optionalWith(MessageReactionEmojiResponse, { nullable: true })
}) {}

export class PollAnswerResponse extends S.Class<PollAnswerResponse>("PollAnswerResponse")({
  "answer_id": S.Int,
  "poll_media": PollMediaResponse
}) {}

export class PollLayoutTypes extends S.Int {}

export class PollResultsEntryResponse extends S.Class<PollResultsEntryResponse>("PollResultsEntryResponse")({
  "id": S.Int,
  "count": S.Int,
  "me_voted": S.Boolean
}) {}

export class PollResultsResponse extends S.Class<PollResultsResponse>("PollResultsResponse")({
  "answer_counts": S.Array(PollResultsEntryResponse),
  "is_finalized": S.Boolean
}) {}

export class PollResponse extends S.Class<PollResponse>("PollResponse")({
  "question": PollMediaResponse,
  "answers": S.Array(PollAnswerResponse),
  "expiry": S.String,
  "allow_multiselect": S.Boolean,
  "layout_type": PollLayoutTypes,
  "results": PollResultsResponse
}) {}

export class MessageShareCustomUserThemeBaseTheme extends S.Union(/**
* No base theme
*/
S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class CustomClientThemeResponse extends S.Class<CustomClientThemeResponse>("CustomClientThemeResponse")({
  "colors": S.Array(S.String),
  "gradient_angle": S.Int,
  "base_mix": S.Int,
  "base_theme": MessageShareCustomUserThemeBaseTheme
}) {}

export class ApplicationCommandInteractionMetadataResponse extends S.Class<ApplicationCommandInteractionMetadataResponse>("ApplicationCommandInteractionMetadataResponse")({
  "id": SnowflakeType,
  "type": S.Literal(2),
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "authorizing_integration_owners": S.Record({ key: S.String, value: S.Unknown }),
  "original_response_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "target_user": S.optionalWith(UserResponse, { nullable: true }),
  "target_message_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class MessageComponentInteractionMetadataResponse extends S.Class<MessageComponentInteractionMetadataResponse>("MessageComponentInteractionMetadataResponse")({
  "id": SnowflakeType,
  "type": S.Literal(3),
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "authorizing_integration_owners": S.Record({ key: S.String, value: S.Unknown }),
  "original_response_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "interacted_message_id": SnowflakeType
}) {}

export class ModalSubmitInteractionMetadataResponse extends S.Class<ModalSubmitInteractionMetadataResponse>("ModalSubmitInteractionMetadataResponse")({
  "id": SnowflakeType,
  "type": S.Literal(5),
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "authorizing_integration_owners": S.Record({ key: S.String, value: S.Unknown }),
  "original_response_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "triggering_interaction_metadata": S.Union(ApplicationCommandInteractionMetadataResponse,
MessageComponentInteractionMetadataResponse)
}) {}

export class MinimalContentMessageResponse extends S.Class<MinimalContentMessageResponse>("MinimalContentMessageResponse")({
  "type": MessageType,
  "content": S.String,
  "mentions": S.Array(UserResponse),
  "mention_roles": S.Array(SnowflakeType),
  "attachments": S.Array(MessageAttachmentResponse),
  "embeds": S.Array(MessageEmbedResponse),
  "timestamp": S.String,
  "edited_timestamp": S.optionalWith(S.String, { nullable: true }),
  "flags": S.Int,
  "components": S.Array(S.Union(ActionRowComponentResponse,
ContainerComponentResponse,
FileComponentResponse,
MediaGalleryComponentResponse,
SectionComponentResponse,
SeparatorComponentResponse,
TextDisplayComponentResponse)),
  "stickers": S.optionalWith(S.Array(S.Union(GuildStickerResponse,
StandardStickerResponse)), { nullable: true }),
  "sticker_items": S.optionalWith(S.Array(MessageStickerItemResponse), { nullable: true })
}) {}

export class MessageSnapshotResponse extends S.Class<MessageSnapshotResponse>("MessageSnapshotResponse")({
  "message": MinimalContentMessageResponse
}) {}

export class MessageReactionCountDetailsResponse extends S.Class<MessageReactionCountDetailsResponse>("MessageReactionCountDetailsResponse")({
  "burst": S.Int,
  "normal": S.Int
}) {}

export class MessageReactionResponse extends S.Class<MessageReactionResponse>("MessageReactionResponse")({
  "emoji": MessageReactionEmojiResponse,
  "count": S.Int,
  "count_details": MessageReactionCountDetailsResponse,
  "burst_colors": S.Array(S.String),
  "me_burst": S.Boolean,
  "me": S.Boolean
}) {}

export class BasicMessageResponse extends S.Class<BasicMessageResponse>("BasicMessageResponse")({
  "type": MessageType,
  "content": S.String,
  "mentions": S.Array(UserResponse),
  "mention_roles": S.Array(SnowflakeType),
  "attachments": S.Array(MessageAttachmentResponse),
  "embeds": S.Array(MessageEmbedResponse),
  "timestamp": S.String,
  "edited_timestamp": S.optionalWith(S.String, { nullable: true }),
  "flags": S.Int,
  "components": S.Array(S.Union(ActionRowComponentResponse,
ContainerComponentResponse,
FileComponentResponse,
MediaGalleryComponentResponse,
SectionComponentResponse,
SeparatorComponentResponse,
TextDisplayComponentResponse)),
  "stickers": S.optionalWith(S.Array(S.Union(GuildStickerResponse,
StandardStickerResponse)), { nullable: true }),
  "sticker_items": S.optionalWith(S.Array(MessageStickerItemResponse), { nullable: true }),
  "id": SnowflakeType,
  "channel_id": SnowflakeType,
  "author": UserResponse,
  "pinned": S.Boolean,
  "mention_everyone": S.Boolean,
  "tts": S.Boolean,
  "call": S.optionalWith(MessageCallResponse, { nullable: true }),
  "activity": S.optionalWith(MessageActivityResponse, { nullable: true }),
  "application": S.optionalWith(BasicApplicationResponse, { nullable: true }),
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "interaction": S.optionalWith(MessageInteractionResponse, { nullable: true }),
  "nonce": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
S.String.pipe(S.maxLength(25))), { nullable: true }),
  "webhook_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "message_reference": S.optionalWith(MessageReferenceResponse, { nullable: true }),
  "thread": S.optionalWith(ThreadResponse, { nullable: true }),
  "mention_channels": S.optionalWith(S.Array(S.Union(S.Null,
MessageMentionChannelResponse)), { nullable: true }),
  "role_subscription_data": S.optionalWith(MessageRoleSubscriptionDataResponse, { nullable: true }),
  "purchase_notification": S.optionalWith(PurchaseNotificationResponse, { nullable: true }),
  "position": S.optionalWith(S.Int, { nullable: true }),
  "resolved": S.optionalWith(ResolvedObjectsResponse, { nullable: true }),
  "poll": S.optionalWith(PollResponse, { nullable: true }),
  "shared_client_theme": S.optionalWith(CustomClientThemeResponse, { nullable: true }),
  "interaction_metadata": S.optionalWith(S.Union(ApplicationCommandInteractionMetadataResponse,
MessageComponentInteractionMetadataResponse,
ModalSubmitInteractionMetadataResponse), { nullable: true }),
  "message_snapshots": S.optionalWith(S.Array(MessageSnapshotResponse), { nullable: true })
}) {}

export class MessageResponse extends S.Class<MessageResponse>("MessageResponse")({
  "type": MessageType,
  "content": S.String,
  "mentions": S.Array(UserResponse),
  "mention_roles": S.Array(SnowflakeType),
  "attachments": S.Array(MessageAttachmentResponse),
  "embeds": S.Array(MessageEmbedResponse),
  "timestamp": S.String,
  "edited_timestamp": S.optionalWith(S.String, { nullable: true }),
  "flags": S.Int,
  "components": S.Array(S.Union(ActionRowComponentResponse,
ContainerComponentResponse,
FileComponentResponse,
MediaGalleryComponentResponse,
SectionComponentResponse,
SeparatorComponentResponse,
TextDisplayComponentResponse)),
  "stickers": S.optionalWith(S.Array(S.Union(GuildStickerResponse,
StandardStickerResponse)), { nullable: true }),
  "sticker_items": S.optionalWith(S.Array(MessageStickerItemResponse), { nullable: true }),
  "id": SnowflakeType,
  "channel_id": SnowflakeType,
  "author": UserResponse,
  "pinned": S.Boolean,
  "mention_everyone": S.Boolean,
  "tts": S.Boolean,
  "call": S.optionalWith(MessageCallResponse, { nullable: true }),
  "activity": S.optionalWith(MessageActivityResponse, { nullable: true }),
  "application": S.optionalWith(BasicApplicationResponse, { nullable: true }),
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "interaction": S.optionalWith(MessageInteractionResponse, { nullable: true }),
  "nonce": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
S.String.pipe(S.maxLength(25))), { nullable: true }),
  "webhook_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "message_reference": S.optionalWith(MessageReferenceResponse, { nullable: true }),
  "thread": S.optionalWith(ThreadResponse, { nullable: true }),
  "mention_channels": S.optionalWith(S.Array(S.Union(S.Null,
MessageMentionChannelResponse)), { nullable: true }),
  "role_subscription_data": S.optionalWith(MessageRoleSubscriptionDataResponse, { nullable: true }),
  "purchase_notification": S.optionalWith(PurchaseNotificationResponse, { nullable: true }),
  "position": S.optionalWith(S.Int, { nullable: true }),
  "resolved": S.optionalWith(ResolvedObjectsResponse, { nullable: true }),
  "poll": S.optionalWith(PollResponse, { nullable: true }),
  "shared_client_theme": S.optionalWith(CustomClientThemeResponse, { nullable: true }),
  "interaction_metadata": S.optionalWith(S.Union(ApplicationCommandInteractionMetadataResponse,
MessageComponentInteractionMetadataResponse,
ModalSubmitInteractionMetadataResponse), { nullable: true }),
  "message_snapshots": S.optionalWith(S.Array(MessageSnapshotResponse), { nullable: true }),
  "reactions": S.optionalWith(S.Array(MessageReactionResponse), { nullable: true }),
  "referenced_message": S.optionalWith(BasicMessageResponse, { nullable: true })
}) {}

export class ListMessages200 extends S.Array(MessageResponse) {}

export class RichEmbedAuthor extends S.Class<RichEmbedAuthor>("RichEmbedAuthor")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "icon_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true })
}) {}

export class RichEmbedImage extends S.Class<RichEmbedImage>("RichEmbedImage")({
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(64)), { nullable: true }),
  "placeholder_version": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "is_animated": S.optionalWith(S.Boolean, { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(4096)), { nullable: true })
}) {}

export class RichEmbedThumbnail extends S.Class<RichEmbedThumbnail>("RichEmbedThumbnail")({
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(64)), { nullable: true }),
  "placeholder_version": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "is_animated": S.optionalWith(S.Boolean, { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(4096)), { nullable: true })
}) {}

export class RichEmbedFooter extends S.Class<RichEmbedFooter>("RichEmbedFooter")({
  "text": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "icon_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true })
}) {}

export class RichEmbedField extends S.Class<RichEmbedField>("RichEmbedField")({
  "name": S.String.pipe(S.maxLength(256)),
  "value": S.String.pipe(S.maxLength(1024)),
  "inline": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class RichEmbedProvider extends S.Class<RichEmbedProvider>("RichEmbedProvider")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true })
}) {}

export class RichEmbedVideo extends S.Class<RichEmbedVideo>("RichEmbedVideo")({
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "width": S.optionalWith(S.Int, { nullable: true }),
  "height": S.optionalWith(S.Int, { nullable: true }),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(64)), { nullable: true }),
  "placeholder_version": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "is_animated": S.optionalWith(S.Boolean, { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(4096)), { nullable: true })
}) {}

export class RichEmbed extends S.Class<RichEmbed>("RichEmbed")({
  "type": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "title": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true }),
  "color": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(16777215)), { nullable: true }),
  "timestamp": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(4096)), { nullable: true }),
  "author": S.optionalWith(RichEmbedAuthor, { nullable: true }),
  "image": S.optionalWith(RichEmbedImage, { nullable: true }),
  "thumbnail": S.optionalWith(RichEmbedThumbnail, { nullable: true }),
  "footer": S.optionalWith(RichEmbedFooter, { nullable: true }),
  "fields": S.optionalWith(S.Array(RichEmbedField).pipe(S.maxItems(25)), { nullable: true }),
  "provider": S.optionalWith(RichEmbedProvider, { nullable: true }),
  "video": S.optionalWith(RichEmbedVideo, { nullable: true })
}) {}

export class AllowedMentionTypes extends S.Union(/**
* Controls role mentions
*/
S.Literal("users"),
S.Literal("roles"),
S.Literal("everyone")) {}

export class MessageAllowedMentionsRequest extends S.Class<MessageAllowedMentionsRequest>("MessageAllowedMentionsRequest")({
  "parse": S.optionalWith(S.Array(S.Union(S.Null,
AllowedMentionTypes)).pipe(S.maxItems(1521)), { nullable: true }),
  "users": S.optionalWith(S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(100)), { nullable: true }),
  "roles": S.optionalWith(S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(100)), { nullable: true }),
  "replied_user": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ComponentEmojiForRequest extends S.Class<ComponentEmojiForRequest>("ComponentEmojiForRequest")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.String.pipe(S.maxLength(32))
}) {}

export class ButtonComponentForMessageRequest extends S.Class<ButtonComponentForMessageRequest>("ButtonComponentForMessageRequest")({
  "type": S.Literal(2),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(100)), { nullable: true }),
  "style": ButtonStyleTypes,
  "label": S.optionalWith(S.String.pipe(S.maxLength(80)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "url": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true }),
  "sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji": S.optionalWith(ComponentEmojiForRequest, { nullable: true })
}) {}

export class ChannelSelectDefaultValue extends S.Class<ChannelSelectDefaultValue>("ChannelSelectDefaultValue")({
  "type": S.Literal("channel"),
  "id": SnowflakeType
}) {}

export class ChannelSelectComponentForMessageRequest extends S.Class<ChannelSelectComponentForMessageRequest>("ChannelSelectComponentForMessageRequest")({
  "type": S.Literal(8),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(ChannelSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true }),
  "channel_types": S.optionalWith(S.Array(ChannelTypes), { nullable: true })
}) {}

export class RoleSelectDefaultValue extends S.Class<RoleSelectDefaultValue>("RoleSelectDefaultValue")({
  "type": S.Literal("role"),
  "id": SnowflakeType
}) {}

export class UserSelectDefaultValue extends S.Class<UserSelectDefaultValue>("UserSelectDefaultValue")({
  "type": S.Literal("user"),
  "id": SnowflakeType
}) {}

export class MentionableSelectComponentForMessageRequest extends S.Class<MentionableSelectComponentForMessageRequest>("MentionableSelectComponentForMessageRequest")({
  "type": S.Literal(7),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(S.Union(RoleSelectDefaultValue,
UserSelectDefaultValue)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class RoleSelectComponentForMessageRequest extends S.Class<RoleSelectComponentForMessageRequest>("RoleSelectComponentForMessageRequest")({
  "type": S.Literal(6),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(RoleSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class StringSelectOptionForRequest extends S.Class<StringSelectOptionForRequest>("StringSelectOptionForRequest")({
  "label": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "value": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "default": S.optionalWith(S.Boolean, { nullable: true }),
  "emoji": S.optionalWith(ComponentEmojiForRequest, { nullable: true })
}) {}

export class StringSelectComponentForMessageRequest extends S.Class<StringSelectComponentForMessageRequest>("StringSelectComponentForMessageRequest")({
  "type": S.Literal(3),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.NonEmptyArray(StringSelectOptionForRequest).pipe(S.minItems(1), S.maxItems(25))
}) {}

export class UserSelectComponentForMessageRequest extends S.Class<UserSelectComponentForMessageRequest>("UserSelectComponentForMessageRequest")({
  "type": S.Literal(5),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(UserSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class ActionRowComponentForMessageRequest extends S.Class<ActionRowComponentForMessageRequest>("ActionRowComponentForMessageRequest")({
  "type": S.Literal(1),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "components": S.NonEmptyArray(S.Union(ButtonComponentForMessageRequest,
ChannelSelectComponentForMessageRequest,
MentionableSelectComponentForMessageRequest,
RoleSelectComponentForMessageRequest,
StringSelectComponentForMessageRequest,
UserSelectComponentForMessageRequest)).pipe(S.minItems(1), S.maxItems(5))
}) {}

export class UnfurledMediaRequestWithAttachmentReferenceRequired extends S.Class<UnfurledMediaRequestWithAttachmentReferenceRequired>("UnfurledMediaRequestWithAttachmentReferenceRequired")({
  "url": S.String.pipe(S.maxLength(2048))
}) {}

export class FileComponentForMessageRequest extends S.Class<FileComponentForMessageRequest>("FileComponentForMessageRequest")({
  "type": S.Literal(13),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "spoiler": S.optionalWith(S.Boolean, { nullable: true }),
  "file": UnfurledMediaRequestWithAttachmentReferenceRequired
}) {}

export class UnfurledMediaRequest extends S.Class<UnfurledMediaRequest>("UnfurledMediaRequest")({
  "url": S.String.pipe(S.maxLength(2048))
}) {}

export class MediaGalleryItemRequest extends S.Class<MediaGalleryItemRequest>("MediaGalleryItemRequest")({
  "description": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(1024)), { nullable: true }),
  "spoiler": S.optionalWith(S.Boolean, { nullable: true }),
  "media": UnfurledMediaRequest
}) {}

export class MediaGalleryComponentForMessageRequest extends S.Class<MediaGalleryComponentForMessageRequest>("MediaGalleryComponentForMessageRequest")({
  "type": S.Literal(12),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "items": S.NonEmptyArray(MediaGalleryItemRequest).pipe(S.minItems(1), S.maxItems(10))
}) {}

export class TextDisplayComponentForMessageRequest extends S.Class<TextDisplayComponentForMessageRequest>("TextDisplayComponentForMessageRequest")({
  "type": S.Literal(10),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "content": S.String.pipe(S.minLength(1), S.maxLength(4000))
}) {}

export class ThumbnailComponentForMessageRequest extends S.Class<ThumbnailComponentForMessageRequest>("ThumbnailComponentForMessageRequest")({
  "type": S.Literal(11),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(1024)), { nullable: true }),
  "spoiler": S.optionalWith(S.Boolean, { nullable: true }),
  "media": UnfurledMediaRequest
}) {}

export class SectionComponentForMessageRequest extends S.Class<SectionComponentForMessageRequest>("SectionComponentForMessageRequest")({
  "type": S.Literal(9),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "components": S.NonEmptyArray(TextDisplayComponentForMessageRequest).pipe(S.minItems(1), S.maxItems(3)),
  "accessory": S.Union(ButtonComponentForMessageRequest,
ThumbnailComponentForMessageRequest)
}) {}

export class SeparatorComponentForMessageRequest extends S.Class<SeparatorComponentForMessageRequest>("SeparatorComponentForMessageRequest")({
  "type": S.Literal(14),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "spacing": S.optionalWith(MessageComponentSeparatorSpacingSize, { nullable: true }),
  "divider": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ContainerComponentForMessageRequest extends S.Class<ContainerComponentForMessageRequest>("ContainerComponentForMessageRequest")({
  "type": S.Literal(17),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "accent_color": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(16777215)), { nullable: true }),
  "components": S.NonEmptyArray(S.Union(ActionRowComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.minItems(1), S.maxItems(40)),
  "spoiler": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class MessageAttachmentRequest extends S.Class<MessageAttachmentRequest>("MessageAttachmentRequest")({
  "id": SnowflakeType,
  "filename": S.optionalWith(S.String.pipe(S.maxLength(1024)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1024)), { nullable: true }),
  "duration_secs": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2147483647)), { nullable: true }),
  "waveform": S.optionalWith(S.String.pipe(S.maxLength(400)), { nullable: true }),
  "title": S.optionalWith(S.String.pipe(S.maxLength(1024)), { nullable: true }),
  "is_remix": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class PollEmoji extends S.Class<PollEmoji>("PollEmoji")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(32)), { nullable: true }),
  "animated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class PollMedia extends S.Class<PollMedia>("PollMedia")({
  "text": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(300)), { nullable: true }),
  "emoji": S.optionalWith(PollEmoji, { nullable: true })
}) {}

export class PollEmojiCreateRequest extends S.Class<PollEmojiCreateRequest>("PollEmojiCreateRequest")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(32)), { nullable: true }),
  "animated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class PollMediaCreateRequest extends S.Class<PollMediaCreateRequest>("PollMediaCreateRequest")({
  "text": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(300)), { nullable: true }),
  "emoji": S.optionalWith(PollEmojiCreateRequest, { nullable: true })
}) {}

export class PollAnswerCreateRequest extends S.Class<PollAnswerCreateRequest>("PollAnswerCreateRequest")({
  "poll_media": PollMediaCreateRequest
}) {}

export class PollCreateRequest extends S.Class<PollCreateRequest>("PollCreateRequest")({
  "question": PollMedia,
  "answers": S.NonEmptyArray(PollAnswerCreateRequest).pipe(S.minItems(1), S.maxItems(10)),
  "allow_multiselect": S.optionalWith(S.Boolean, { nullable: true }),
  "layout_type": S.optionalWith(PollLayoutTypes, { nullable: true }),
  "duration": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(768)), { nullable: true })
}) {}

export class CustomClientThemeShareRequest extends S.Class<CustomClientThemeShareRequest>("CustomClientThemeShareRequest")({
  "colors": S.NonEmptyArray(S.String.pipe(S.minLength(6), S.maxLength(6))).pipe(S.minItems(1), S.maxItems(5)),
  "gradient_angle": S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(360)),
  "base_mix": S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)),
  "base_theme": S.optionalWith(MessageShareCustomUserThemeBaseTheme, { nullable: true })
}) {}

export class ConfettiPotionCreateRequest extends S.Class<ConfettiPotionCreateRequest>("ConfettiPotionCreateRequest")({
  
}) {}

export class MessageReferenceRequest extends S.Class<MessageReferenceRequest>("MessageReferenceRequest")({
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "message_id": SnowflakeType,
  "fail_if_not_exists": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.optionalWith(MessageReferenceType, { nullable: true })
}) {}

export class MessageCreateRequest extends S.Class<MessageCreateRequest>("MessageCreateRequest")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(4000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "sticker_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(3)), { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "shared_client_theme": S.optionalWith(CustomClientThemeShareRequest, { nullable: true }),
  "confetti_potion": S.optionalWith(ConfettiPotionCreateRequest, { nullable: true }),
  "message_reference": S.optionalWith(MessageReferenceRequest, { nullable: true }),
  "nonce": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
S.String.pipe(S.maxLength(25))), { nullable: true }),
  "enforce_nonce": S.optionalWith(S.Boolean, { nullable: true }),
  "tts": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BulkDeleteMessagesRequest extends S.Class<BulkDeleteMessagesRequest>("BulkDeleteMessagesRequest")({
  "messages": S.NonEmptyArray(SnowflakeType).pipe(S.minItems(2), S.maxItems(100))
}) {}

export class ListPinsParams extends S.Struct({
  "before": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(50)), { nullable: true })
}) {}

export class PinnedMessageResponse extends S.Class<PinnedMessageResponse>("PinnedMessageResponse")({
  "pinned_at": S.String,
  "message": MessageResponse
}) {}

export class PinnedMessagesResponse extends S.Class<PinnedMessagesResponse>("PinnedMessagesResponse")({
  "items": S.Array(PinnedMessageResponse),
  "has_more": S.Boolean
}) {}

export class MessageEditRequestPartial extends S.Class<MessageEditRequestPartial>("MessageEditRequestPartial")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(4000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "sticker_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(1521)), { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true })
}) {}

export class ReactionTypes extends S.Union(/**
* Normal reaction type
*/
S.Literal(0),
S.Literal(1)) {}

export class ListMessageReactionsByEmojiParams extends S.Struct({
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true }),
  "type": S.optionalWith(ReactionTypes, { nullable: true })
}) {}

export class ListMessageReactionsByEmoji200 extends S.Array(UserResponse) {}

export class CreateTextThreadWithMessageRequest extends S.Class<CreateTextThreadWithMessageRequest>("CreateTextThreadWithMessageRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true })
}) {}

export class SetChannelPermissionOverwriteRequest extends S.Class<SetChannelPermissionOverwriteRequest>("SetChannelPermissionOverwriteRequest")({
  "type": S.optionalWith(ChannelPermissionOverwrites, { nullable: true }),
  "allow": S.optionalWith(S.Int, { nullable: true }),
  "deny": S.optionalWith(S.Int, { nullable: true })
}) {}

export class DeprecatedListPins200 extends S.Array(MessageResponse) {}

export class GetAnswerVotersParams extends S.Struct({
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class PollAnswerDetailsResponse extends S.Class<PollAnswerDetailsResponse>("PollAnswerDetailsResponse")({
  "users": S.Array(UserResponse)
}) {}

export class AddGroupDmUserRequest extends S.Class<AddGroupDmUserRequest>("AddGroupDmUserRequest")({
  "access_token": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "nick": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true })
}) {}

export class AddGroupDmUser201 extends S.Union(PrivateChannelResponse,
PrivateGroupChannelResponse) {}

export class SoundboardSoundSendRequest extends S.Class<SoundboardSoundSendRequest>("SoundboardSoundSendRequest")({
  "sound_id": SnowflakeType,
  "source_guild_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class ListThreadMembersParams extends S.Struct({
  "with_member": S.optionalWith(S.Boolean, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class ListThreadMembers200 extends S.Array(ThreadMemberResponse) {}

export class GetThreadMemberParams extends S.Struct({
  "with_member": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BaseCreateMessageCreateRequest extends S.Class<BaseCreateMessageCreateRequest>("BaseCreateMessageCreateRequest")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(4000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "sticker_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(3)), { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "shared_client_theme": S.optionalWith(CustomClientThemeShareRequest, { nullable: true }),
  "confetti_potion": S.optionalWith(ConfettiPotionCreateRequest, { nullable: true })
}) {}

export class CreateForumThreadRequest extends S.Class<CreateForumThreadRequest>("CreateForumThreadRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "applied_tags": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(5)), { nullable: true }),
  "message": BaseCreateMessageCreateRequest
}) {}

export class CreateTextThreadWithoutMessageRequest extends S.Class<CreateTextThreadWithoutMessageRequest>("CreateTextThreadWithoutMessageRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "type": S.optionalWith(S.Literal(10, 11, 12), { nullable: true }),
  "invitable": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class CreateThreadRequest extends S.Union(CreateForumThreadRequest,
CreateTextThreadWithoutMessageRequest) {}

export class CreatedThreadResponse extends S.Class<CreatedThreadResponse>("CreatedThreadResponse")({
  "id": SnowflakeType,
  "type": S.Literal(10, 11, 12),
  "last_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "flags": S.Int,
  "last_pin_timestamp": S.optionalWith(S.String, { nullable: true }),
  "guild_id": SnowflakeType,
  "name": S.String,
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int, { nullable: true }),
  "bitrate": S.optionalWith(S.Int, { nullable: true }),
  "user_limit": S.optionalWith(S.Int, { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true }),
  "permissions": S.optionalWith(S.String, { nullable: true }),
  "owner_id": SnowflakeType,
  "thread_metadata": ThreadMetadataResponse,
  "message_count": S.Int,
  "member_count": S.Int,
  "total_message_sent": S.Int,
  "applied_tags": S.optionalWith(S.Array(SnowflakeType), { nullable: true }),
  "member": S.optionalWith(ThreadMemberResponse, { nullable: true })
}) {}

export class ListPrivateArchivedThreadsParams extends S.Struct({
  "before": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(2), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class ThreadsResponse extends S.Class<ThreadsResponse>("ThreadsResponse")({
  "threads": S.Array(ThreadResponse),
  "members": S.Array(ThreadMemberResponse),
  "has_more": S.Boolean,
  "first_messages": S.optionalWith(S.Array(MessageResponse), { nullable: true })
}) {}

export class ListPublicArchivedThreadsParams extends S.Struct({
  "before": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(2), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class ThreadSortingMode extends S.Union(S.Literal("relevance"),
S.Literal("creation_time"),
S.Literal("last_message_time"),
S.Literal("archive_time")) {}

export class SortingOrder extends S.Union(S.Literal("asc"),
S.Literal("desc")) {}

export class ThreadSearchParams extends S.Struct({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "slop": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(100)), { nullable: true }),
  "min_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "max_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "tag": S.optionalWith(S.Union(S.String,
S.Array(SnowflakeType).pipe(S.maxItems(20))), { nullable: true }),
  "tag_setting": S.optionalWith(ThreadSearchTagSetting, { nullable: true }),
  "archived": S.optionalWith(S.Boolean, { nullable: true }),
  "sort_by": S.optionalWith(ThreadSortingMode, { nullable: true }),
  "sort_order": S.optionalWith(SortingOrder, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "offset": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(9975)), { nullable: true })
}) {}

export class ThreadSearchResponse extends S.Class<ThreadSearchResponse>("ThreadSearchResponse")({
  "threads": S.Array(ThreadResponse),
  "members": S.Array(ThreadMemberResponse),
  "has_more": S.Boolean,
  "first_messages": S.optionalWith(S.Array(MessageResponse), { nullable: true }),
  "total_results": S.Int
}) {}

export class TypingIndicatorResponse extends S.Class<TypingIndicatorResponse>("TypingIndicatorResponse")({
  
}) {}

export class ListMyPrivateArchivedThreadsParams extends S.Struct({
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(2), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class WebhookTypes extends S.Union(/**
* Incoming Webhooks can post messages to channels with a generated token
*/
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class ApplicationIncomingWebhookResponse extends S.Class<ApplicationIncomingWebhookResponse>("ApplicationIncomingWebhookResponse")({
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "id": SnowflakeType,
  "name": S.String,
  "type": S.Literal(3),
  "user": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class WebhookSourceGuildResponse extends S.Class<WebhookSourceGuildResponse>("WebhookSourceGuildResponse")({
  "id": SnowflakeType,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "name": S.String
}) {}

export class WebhookSourceChannelResponse extends S.Class<WebhookSourceChannelResponse>("WebhookSourceChannelResponse")({
  "id": SnowflakeType,
  "name": S.String
}) {}

export class ChannelFollowerWebhookResponse extends S.Class<ChannelFollowerWebhookResponse>("ChannelFollowerWebhookResponse")({
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "id": SnowflakeType,
  "name": S.String,
  "type": S.Literal(2),
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "source_guild": S.optionalWith(WebhookSourceGuildResponse, { nullable: true }),
  "source_channel": S.optionalWith(WebhookSourceChannelResponse, { nullable: true })
}) {}

export class GuildIncomingWebhookResponse extends S.Class<GuildIncomingWebhookResponse>("GuildIncomingWebhookResponse")({
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "id": SnowflakeType,
  "name": S.String,
  "type": S.Literal(1),
  "user": S.optionalWith(UserResponse, { nullable: true }),
  "token": S.optionalWith(S.String, { nullable: true }),
  "url": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListChannelWebhooks200 extends S.Array(S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse)) {}

export class CreateWebhookRequest extends S.Class<CreateWebhookRequest>("CreateWebhookRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(80)),
  "avatar": S.optionalWith(S.String, { nullable: true })
}) {}

export class GatewayResponse extends S.Class<GatewayResponse>("GatewayResponse")({
  "url": S.String
}) {}

export class GatewayBotSessionStartLimitResponse extends S.Class<GatewayBotSessionStartLimitResponse>("GatewayBotSessionStartLimitResponse")({
  "max_concurrency": S.Int,
  "remaining": S.Int,
  "reset_after": S.Int,
  "total": S.Int
}) {}

export class GatewayBotResponse extends S.Class<GatewayBotResponse>("GatewayBotResponse")({
  "url": S.String,
  "session_start_limit": GatewayBotSessionStartLimitResponse,
  "shards": S.Int
}) {}

export class UserNotificationSettings extends S.Union(/**
* members will receive notifications for all messages by default
*/
S.Literal(0),
S.Literal(1)) {}

export class GuildExplicitContentFilterTypes extends S.Union(/**
* media content will not be scanned
*/
S.Literal(0),
S.Literal(1),
S.Literal(2)) {}

export class AvailableLocalesEnum extends S.Union(/**
* The ar locale
*/
S.Literal("ar"),
S.Literal("bg"),
S.Literal("cs"),
S.Literal("da"),
S.Literal("de"),
S.Literal("el"),
S.Literal("en-GB"),
S.Literal("en-US"),
S.Literal("es-419"),
S.Literal("es-ES"),
S.Literal("fi"),
S.Literal("fr"),
S.Literal("he"),
S.Literal("hi"),
S.Literal("hr"),
S.Literal("hu"),
S.Literal("id"),
S.Literal("it"),
S.Literal("ja"),
S.Literal("ko"),
S.Literal("lt"),
S.Literal("nl"),
S.Literal("no"),
S.Literal("pl"),
S.Literal("pt-BR"),
S.Literal("ro"),
S.Literal("ru"),
S.Literal("sv-SE"),
S.Literal("th"),
S.Literal("tr"),
S.Literal("uk"),
S.Literal("vi"),
S.Literal("zh-CN"),
S.Literal("zh-TW")) {}

export class AfkTimeouts extends S.Union(S.Literal(60),
S.Literal(300),
S.Literal(900),
S.Literal(1800),
S.Literal(3600)) {}

export class GuildTemplateRoleColorsResponse extends S.Class<GuildTemplateRoleColorsResponse>("GuildTemplateRoleColorsResponse")({
  "primary_color": S.Int,
  "secondary_color": S.optionalWith(S.Int, { nullable: true }),
  "tertiary_color": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GuildTemplateRoleResponse extends S.Class<GuildTemplateRoleResponse>("GuildTemplateRoleResponse")({
  "id": S.Int,
  "name": S.String,
  "permissions": S.String,
  "color": S.Int,
  "colors": S.optionalWith(GuildTemplateRoleColorsResponse, { nullable: true }),
  "hoist": S.Boolean,
  "mentionable": S.Boolean,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "unicode_emoji": S.optionalWith(S.String, { nullable: true })
}) {}

export class GuildTemplateChannelTags extends S.Class<GuildTemplateChannelTags>("GuildTemplateChannelTags")({
  "id": S.optionalWith(S.Int, { nullable: true }),
  "name": S.String,
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String, { nullable: true }),
  "moderated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class IconEmojiResponse extends S.Class<IconEmojiResponse>("IconEmojiResponse")({
  
}) {}

export class GuildTemplateChannelResponse extends S.Class<GuildTemplateChannelResponse>("GuildTemplateChannelResponse")({
  "id": S.optionalWith(S.Int, { nullable: true }),
  "type": S.Literal(0, 2, 4, 15),
  "name": S.optionalWith(S.String, { nullable: true }),
  "position": S.optionalWith(S.Int, { nullable: true }),
  "topic": S.optionalWith(S.String, { nullable: true }),
  "bitrate": S.Int,
  "user_limit": S.Int,
  "nsfw": S.Boolean,
  "rate_limit_per_user": S.Int,
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "default_auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "permission_overwrites": S.Array(S.Union(S.Null,
ChannelPermissionOverwriteResponse)),
  "available_tags": S.optionalWith(S.Array(GuildTemplateChannelTags), { nullable: true }),
  "template": S.String,
  "default_reaction_emoji": S.optionalWith(DefaultReactionEmojiResponse, { nullable: true }),
  "default_thread_rate_limit_per_user": S.optionalWith(S.Int, { nullable: true }),
  "default_sort_order": S.optionalWith(ThreadSortOrder, { nullable: true }),
  "default_forum_layout": S.optionalWith(ForumLayout, { nullable: true }),
  "default_tag_setting": S.optionalWith(ThreadSearchTagSetting, { nullable: true }),
  "icon_emoji": S.optionalWith(IconEmojiResponse, { nullable: true }),
  "theme_color": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GuildTemplateSnapshotResponse extends S.Class<GuildTemplateSnapshotResponse>("GuildTemplateSnapshotResponse")({
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "region": S.optionalWith(S.String, { nullable: true }),
  "verification_level": VerificationLevels,
  "default_message_notifications": UserNotificationSettings,
  "explicit_content_filter": GuildExplicitContentFilterTypes,
  "preferred_locale": AvailableLocalesEnum,
  "afk_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "afk_timeout": AfkTimeouts,
  "system_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "system_channel_flags": S.Int,
  "roles": S.Array(GuildTemplateRoleResponse),
  "channels": S.Array(GuildTemplateChannelResponse)
}) {}

export class GuildTemplateResponse extends S.Class<GuildTemplateResponse>("GuildTemplateResponse")({
  "code": S.String,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "usage_count": S.Int,
  "creator_id": SnowflakeType,
  "creator": S.optionalWith(UserResponse, { nullable: true }),
  "created_at": S.String,
  "updated_at": S.String,
  "source_guild_id": SnowflakeType,
  "serialized_source_guild": GuildTemplateSnapshotResponse,
  "is_dirty": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GetGuildParams extends S.Struct({
  "with_counts": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GuildRoleColorsResponse extends S.Class<GuildRoleColorsResponse>("GuildRoleColorsResponse")({
  "primary_color": S.Int,
  "secondary_color": S.optionalWith(S.Int, { nullable: true }),
  "tertiary_color": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GuildRoleTagsResponse extends S.Class<GuildRoleTagsResponse>("GuildRoleTagsResponse")({
  "premium_subscriber": S.optionalWith(S.Null, { nullable: true }),
  "bot_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "integration_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "subscription_listing_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "available_for_purchase": S.optionalWith(S.Null, { nullable: true }),
  "guild_connections": S.optionalWith(S.Null, { nullable: true })
}) {}

export class GuildRoleResponse extends S.Class<GuildRoleResponse>("GuildRoleResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "permissions": S.String,
  "position": S.Int,
  "color": S.Int,
  "colors": GuildRoleColorsResponse,
  "hoist": S.Boolean,
  "managed": S.Boolean,
  "mentionable": S.Boolean,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "unicode_emoji": S.optionalWith(S.String, { nullable: true }),
  "tags": S.optionalWith(GuildRoleTagsResponse, { nullable: true }),
  "flags": S.Int
}) {}

export class GuildMFALevel extends S.Union(/**
* Guild has no MFA/2FA requirement for moderation actions
*/
S.Literal(0),
S.Literal(1)) {}

export class PremiumGuildTiers extends S.Union(/**
* Guild has not unlocked any Server Boost perks
*/
S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class GuildWithCountsResponse extends S.Class<GuildWithCountsResponse>("GuildWithCountsResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "home_header": S.optionalWith(S.String, { nullable: true }),
  "splash": S.optionalWith(S.String, { nullable: true }),
  "discovery_splash": S.optionalWith(S.String, { nullable: true }),
  "features": S.Array(GuildFeatures),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "owner_id": SnowflakeType,
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "region": S.String,
  "afk_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "afk_timeout": AfkTimeouts,
  "system_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "system_channel_flags": S.Int,
  "widget_enabled": S.Boolean,
  "widget_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "verification_level": VerificationLevels,
  "roles": S.Array(GuildRoleResponse),
  "default_message_notifications": UserNotificationSettings,
  "mfa_level": GuildMFALevel,
  "explicit_content_filter": GuildExplicitContentFilterTypes,
  "max_presences": S.optionalWith(S.Int, { nullable: true }),
  "max_members": S.Int,
  "max_stage_video_channel_users": S.Int,
  "max_video_channel_users": S.Int,
  "vanity_url_code": S.optionalWith(S.String, { nullable: true }),
  "premium_tier": PremiumGuildTiers,
  "premium_subscription_count": S.Int,
  "preferred_locale": AvailableLocalesEnum,
  "rules_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "safety_alerts_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "public_updates_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "premium_progress_bar_enabled": S.Boolean,
  "nsfw": S.Boolean,
  "nsfw_level": GuildNSFWContentLevel,
  "emojis": S.Array(EmojiResponse),
  "stickers": S.Array(GuildStickerResponse),
  "approximate_member_count": S.optionalWith(S.Int, { nullable: true }),
  "approximate_presence_count": S.optionalWith(S.Int, { nullable: true })
}) {}

export class GuildPatchRequestPartial extends S.Class<GuildPatchRequestPartial>("GuildPatchRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(100)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(300)), { nullable: true }),
  "region": S.optionalWith(S.String, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "verification_level": S.optionalWith(VerificationLevels, { nullable: true }),
  "default_message_notifications": S.optionalWith(UserNotificationSettings, { nullable: true }),
  "explicit_content_filter": S.optionalWith(GuildExplicitContentFilterTypes, { nullable: true }),
  "preferred_locale": S.optionalWith(AvailableLocalesEnum, { nullable: true }),
  "afk_timeout": S.optionalWith(AfkTimeouts, { nullable: true }),
  "afk_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "system_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "splash": S.optionalWith(S.String, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "system_channel_flags": S.optionalWith(S.Int, { nullable: true }),
  "features": S.optionalWith(S.Array(S.String.pipe(S.maxLength(152133))).pipe(S.maxItems(1521)), { nullable: true }),
  "discovery_splash": S.optionalWith(S.String, { nullable: true }),
  "home_header": S.optionalWith(S.String, { nullable: true }),
  "rules_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "safety_alerts_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "public_updates_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "premium_progress_bar_enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GuildResponse extends S.Class<GuildResponse>("GuildResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "home_header": S.optionalWith(S.String, { nullable: true }),
  "splash": S.optionalWith(S.String, { nullable: true }),
  "discovery_splash": S.optionalWith(S.String, { nullable: true }),
  "features": S.Array(GuildFeatures),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "owner_id": SnowflakeType,
  "application_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "region": S.String,
  "afk_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "afk_timeout": AfkTimeouts,
  "system_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "system_channel_flags": S.Int,
  "widget_enabled": S.Boolean,
  "widget_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "verification_level": VerificationLevels,
  "roles": S.Array(GuildRoleResponse),
  "default_message_notifications": UserNotificationSettings,
  "mfa_level": GuildMFALevel,
  "explicit_content_filter": GuildExplicitContentFilterTypes,
  "max_presences": S.optionalWith(S.Int, { nullable: true }),
  "max_members": S.Int,
  "max_stage_video_channel_users": S.Int,
  "max_video_channel_users": S.Int,
  "vanity_url_code": S.optionalWith(S.String, { nullable: true }),
  "premium_tier": PremiumGuildTiers,
  "premium_subscription_count": S.Int,
  "preferred_locale": AvailableLocalesEnum,
  "rules_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "safety_alerts_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "public_updates_channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "premium_progress_bar_enabled": S.Boolean,
  "nsfw": S.Boolean,
  "nsfw_level": GuildNSFWContentLevel,
  "emojis": S.Array(EmojiResponse),
  "stickers": S.Array(GuildStickerResponse)
}) {}

export class AuditLogActionTypes extends S.Union(S.Literal(1),
S.Literal(10),
S.Literal(11),
S.Literal(12),
S.Literal(13),
S.Literal(14),
S.Literal(15),
S.Literal(20),
S.Literal(21),
S.Literal(22),
S.Literal(23),
S.Literal(24),
S.Literal(25),
S.Literal(26),
S.Literal(27),
S.Literal(28),
S.Literal(30),
S.Literal(31),
S.Literal(32),
S.Literal(40),
S.Literal(41),
S.Literal(42),
S.Literal(50),
S.Literal(51),
S.Literal(52),
S.Literal(60),
S.Literal(61),
S.Literal(62),
S.Literal(72),
S.Literal(73),
S.Literal(74),
S.Literal(75),
S.Literal(80),
S.Literal(81),
S.Literal(82),
S.Literal(83),
S.Literal(84),
S.Literal(85),
S.Literal(90),
S.Literal(91),
S.Literal(92),
S.Literal(100),
S.Literal(101),
S.Literal(102),
S.Literal(110),
S.Literal(111),
S.Literal(112),
S.Literal(121),
S.Literal(130),
S.Literal(131),
S.Literal(132),
S.Literal(140),
S.Literal(141),
S.Literal(142),
S.Literal(143),
S.Literal(144),
S.Literal(145),
S.Literal(146),
S.Literal(150),
S.Literal(151),
S.Literal(163),
S.Literal(164),
S.Literal(165),
S.Literal(166),
S.Literal(167),
S.Literal(171),
S.Literal(172),
S.Literal(180),
S.Literal(190),
S.Literal(191),
S.Literal(192),
S.Literal(193),
S.Literal(211)) {}

export class ListGuildAuditLogEntriesParams extends S.Struct({
  "user_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "target_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "action_type": S.optionalWith(AuditLogActionTypes, { nullable: true }),
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true })
}) {}

export class AuditLogObjectChangeResponse extends S.Class<AuditLogObjectChangeResponse>("AuditLogObjectChangeResponse")({
  "key": S.optionalWith(S.String, { nullable: true })
}) {}

export class AuditLogEntryResponse extends S.Class<AuditLogEntryResponse>("AuditLogEntryResponse")({
  "id": SnowflakeType,
  "action_type": AuditLogActionTypes,
  "user_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "target_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "changes": S.optionalWith(S.Array(AuditLogObjectChangeResponse), { nullable: true }),
  "options": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "reason": S.optionalWith(S.String, { nullable: true })
}) {}

export class IntegrationTypes extends S.Union(S.Literal("discord"),
S.Literal("twitch"),
S.Literal("youtube"),
S.Literal("guild_subscription")) {}

export class AccountResponse extends S.Class<AccountResponse>("AccountResponse")({
  "id": S.String,
  "name": S.optionalWith(S.String, { nullable: true })
}) {}

export class PartialDiscordIntegrationResponse extends S.Class<PartialDiscordIntegrationResponse>("PartialDiscordIntegrationResponse")({
  "id": SnowflakeType,
  "type": S.Literal("discord"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse,
  "application_id": SnowflakeType
}) {}

export class PartialExternalConnectionIntegrationResponse extends S.Class<PartialExternalConnectionIntegrationResponse>("PartialExternalConnectionIntegrationResponse")({
  "id": SnowflakeType,
  "type": S.Literal("twitch", "youtube"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse
}) {}

export class PartialGuildSubscriptionIntegrationResponse extends S.Class<PartialGuildSubscriptionIntegrationResponse>("PartialGuildSubscriptionIntegrationResponse")({
  "id": SnowflakeType,
  "type": S.Literal("guild_subscription"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse
}) {}

export class EntityMetadataExternalResponse extends S.Class<EntityMetadataExternalResponse>("EntityMetadataExternalResponse")({
  "location": S.String
}) {}

export class ExternalScheduledEventResponse extends S.Class<ExternalScheduledEventResponse>("ExternalScheduledEventResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator": S.optionalWith(UserResponse, { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "status": GuildScheduledEventStatuses,
  "entity_type": S.Literal(3),
  "entity_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "user_count": S.optionalWith(S.Int, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "user_rsvp": S.optionalWith(ScheduledEventUserResponse, { nullable: true }),
  "entity_metadata": EntityMetadataExternalResponse
}) {}

export class EntityMetadataStageInstanceResponse extends S.Class<EntityMetadataStageInstanceResponse>("EntityMetadataStageInstanceResponse")({
  
}) {}

export class StageScheduledEventResponse extends S.Class<StageScheduledEventResponse>("StageScheduledEventResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator": S.optionalWith(UserResponse, { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "status": GuildScheduledEventStatuses,
  "entity_type": S.Literal(1),
  "entity_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "user_count": S.optionalWith(S.Int, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "user_rsvp": S.optionalWith(ScheduledEventUserResponse, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataStageInstanceResponse, { nullable: true })
}) {}

export class EntityMetadataVoiceResponse extends S.Class<EntityMetadataVoiceResponse>("EntityMetadataVoiceResponse")({
  
}) {}

export class VoiceScheduledEventResponse extends S.Class<VoiceScheduledEventResponse>("VoiceScheduledEventResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "creator": S.optionalWith(UserResponse, { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "status": GuildScheduledEventStatuses,
  "entity_type": S.Literal(2),
  "entity_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "user_count": S.optionalWith(S.Int, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "user_rsvp": S.optionalWith(ScheduledEventUserResponse, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataVoiceResponse, { nullable: true })
}) {}

export class AutomodEventType extends S.Union(/**
* A user submitted a message to a channel
*/
S.Literal(1),
S.Literal(2)) {}

export class AutomodActionType extends S.Union(/**
* Block a user's message and prevent it from being posted. A custom explanation can be specified and shown to members whenever their message is blocked
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4)) {}

export class BlockMessageActionMetadataResponse extends S.Class<BlockMessageActionMetadataResponse>("BlockMessageActionMetadataResponse")({
  "custom_message": S.optionalWith(S.String, { nullable: true })
}) {}

export class BlockMessageActionResponse extends S.Class<BlockMessageActionResponse>("BlockMessageActionResponse")({
  "type": S.Literal(1),
  "metadata": BlockMessageActionMetadataResponse
}) {}

export class FlagToChannelActionMetadataResponse extends S.Class<FlagToChannelActionMetadataResponse>("FlagToChannelActionMetadataResponse")({
  "channel_id": SnowflakeType
}) {}

export class FlagToChannelActionResponse extends S.Class<FlagToChannelActionResponse>("FlagToChannelActionResponse")({
  "type": S.Literal(2),
  "metadata": FlagToChannelActionMetadataResponse
}) {}

export class QuarantineUserActionMetadataResponse extends S.Class<QuarantineUserActionMetadataResponse>("QuarantineUserActionMetadataResponse")({
  
}) {}

export class QuarantineUserActionResponse extends S.Class<QuarantineUserActionResponse>("QuarantineUserActionResponse")({
  "type": S.Literal(4),
  "metadata": QuarantineUserActionMetadataResponse
}) {}

export class UserCommunicationDisabledActionMetadataResponse extends S.Class<UserCommunicationDisabledActionMetadataResponse>("UserCommunicationDisabledActionMetadataResponse")({
  "duration_seconds": S.Int
}) {}

export class UserCommunicationDisabledActionResponse extends S.Class<UserCommunicationDisabledActionResponse>("UserCommunicationDisabledActionResponse")({
  "type": S.Literal(3),
  "metadata": UserCommunicationDisabledActionMetadataResponse
}) {}

export class AutomodTriggerType extends S.Union(/**
* Check if content contains words from a list of keywords or matches regex
*/
S.Literal(1),
S.Literal(2),
S.Literal(3),
S.Literal(4),
S.Literal(5)) {}

export class AutomodKeywordPresetType extends S.Union(/**
* Words and phrases that may be considered profanity
*/
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class DefaultKeywordListTriggerMetadataResponse extends S.Class<DefaultKeywordListTriggerMetadataResponse>("DefaultKeywordListTriggerMetadataResponse")({
  "allow_list": S.Array(S.String),
  "presets": S.Array(AutomodKeywordPresetType)
}) {}

export class DefaultKeywordRuleResponse extends S.Class<DefaultKeywordRuleResponse>("DefaultKeywordRuleResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "creator_id": SnowflakeType,
  "name": S.String,
  "event_type": AutomodEventType,
  "actions": S.Array(S.Union(BlockMessageActionResponse,
FlagToChannelActionResponse,
QuarantineUserActionResponse,
UserCommunicationDisabledActionResponse)),
  "trigger_type": S.Literal(4),
  "enabled": S.Boolean,
  "exempt_roles": S.Array(SnowflakeType),
  "exempt_channels": S.Array(SnowflakeType),
  "trigger_metadata": DefaultKeywordListTriggerMetadataResponse
}) {}

export class KeywordTriggerMetadataResponse extends S.Class<KeywordTriggerMetadataResponse>("KeywordTriggerMetadataResponse")({
  "keyword_filter": S.Array(S.String),
  "regex_patterns": S.Array(S.String),
  "allow_list": S.Array(S.String)
}) {}

export class KeywordRuleResponse extends S.Class<KeywordRuleResponse>("KeywordRuleResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "creator_id": SnowflakeType,
  "name": S.String,
  "event_type": AutomodEventType,
  "actions": S.Array(S.Union(BlockMessageActionResponse,
FlagToChannelActionResponse,
QuarantineUserActionResponse,
UserCommunicationDisabledActionResponse)),
  "trigger_type": S.Literal(1),
  "enabled": S.Boolean,
  "exempt_roles": S.Array(SnowflakeType),
  "exempt_channels": S.Array(SnowflakeType),
  "trigger_metadata": KeywordTriggerMetadataResponse
}) {}

export class MLSpamTriggerMetadataResponse extends S.Class<MLSpamTriggerMetadataResponse>("MLSpamTriggerMetadataResponse")({
  
}) {}

export class MLSpamRuleResponse extends S.Class<MLSpamRuleResponse>("MLSpamRuleResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "creator_id": SnowflakeType,
  "name": S.String,
  "event_type": AutomodEventType,
  "actions": S.Array(S.Union(BlockMessageActionResponse,
FlagToChannelActionResponse,
QuarantineUserActionResponse,
UserCommunicationDisabledActionResponse)),
  "trigger_type": S.Literal(3),
  "enabled": S.Boolean,
  "exempt_roles": S.Array(SnowflakeType),
  "exempt_channels": S.Array(SnowflakeType),
  "trigger_metadata": MLSpamTriggerMetadataResponse
}) {}

export class MentionSpamTriggerMetadataResponse extends S.Class<MentionSpamTriggerMetadataResponse>("MentionSpamTriggerMetadataResponse")({
  "mention_total_limit": S.Int,
  "mention_raid_protection_enabled": S.Boolean
}) {}

export class MentionSpamRuleResponse extends S.Class<MentionSpamRuleResponse>("MentionSpamRuleResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "creator_id": SnowflakeType,
  "name": S.String,
  "event_type": AutomodEventType,
  "actions": S.Array(S.Union(BlockMessageActionResponse,
FlagToChannelActionResponse,
QuarantineUserActionResponse,
UserCommunicationDisabledActionResponse)),
  "trigger_type": S.Literal(5),
  "enabled": S.Boolean,
  "exempt_roles": S.Array(SnowflakeType),
  "exempt_channels": S.Array(SnowflakeType),
  "trigger_metadata": MentionSpamTriggerMetadataResponse
}) {}

export class SpamLinkTriggerMetadataResponse extends S.Class<SpamLinkTriggerMetadataResponse>("SpamLinkTriggerMetadataResponse")({
  
}) {}

export class SpamLinkRuleResponse extends S.Class<SpamLinkRuleResponse>("SpamLinkRuleResponse")({
  "id": SnowflakeType,
  "guild_id": SnowflakeType,
  "creator_id": SnowflakeType,
  "name": S.String,
  "event_type": AutomodEventType,
  "actions": S.Array(S.Union(BlockMessageActionResponse,
FlagToChannelActionResponse,
QuarantineUserActionResponse,
UserCommunicationDisabledActionResponse)),
  "trigger_type": S.Literal(2),
  "enabled": S.Boolean,
  "exempt_roles": S.Array(SnowflakeType),
  "exempt_channels": S.Array(SnowflakeType),
  "trigger_metadata": SpamLinkTriggerMetadataResponse
}) {}

export class GuildAuditLogResponse extends S.Class<GuildAuditLogResponse>("GuildAuditLogResponse")({
  "audit_log_entries": S.Array(AuditLogEntryResponse),
  "users": S.Array(UserResponse),
  "integrations": S.Array(S.Union(PartialDiscordIntegrationResponse,
PartialExternalConnectionIntegrationResponse,
PartialGuildSubscriptionIntegrationResponse)),
  "webhooks": S.Array(S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse)),
  "guild_scheduled_events": S.Array(S.Union(ExternalScheduledEventResponse,
StageScheduledEventResponse,
VoiceScheduledEventResponse)),
  "threads": S.Array(ThreadResponse),
  "application_commands": S.Array(ApplicationCommandResponse),
  "auto_moderation_rules": S.Array(S.Union(DefaultKeywordRuleResponse,
KeywordRuleResponse,
MLSpamRuleResponse,
MentionSpamRuleResponse,
SpamLinkRuleResponse,
S.Null))
}) {}

export class ListAutoModerationRules200 extends S.Array(S.Union(DefaultKeywordRuleResponse,
KeywordRuleResponse,
MLSpamRuleResponse,
MentionSpamRuleResponse,
SpamLinkRuleResponse,
S.Null)) {}

export class BlockMessageActionMetadata extends S.Class<BlockMessageActionMetadata>("BlockMessageActionMetadata")({
  "custom_message": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true })
}) {}

export class BlockMessageAction extends S.Class<BlockMessageAction>("BlockMessageAction")({
  "type": S.Literal(1),
  "metadata": S.optionalWith(BlockMessageActionMetadata, { nullable: true })
}) {}

export class FlagToChannelActionMetadata extends S.Class<FlagToChannelActionMetadata>("FlagToChannelActionMetadata")({
  "channel_id": SnowflakeType
}) {}

export class FlagToChannelAction extends S.Class<FlagToChannelAction>("FlagToChannelAction")({
  "type": S.Literal(2),
  "metadata": FlagToChannelActionMetadata
}) {}

export class QuarantineUserActionMetadata extends S.Class<QuarantineUserActionMetadata>("QuarantineUserActionMetadata")({
  
}) {}

export class QuarantineUserAction extends S.Class<QuarantineUserAction>("QuarantineUserAction")({
  "type": S.Literal(4),
  "metadata": S.optionalWith(QuarantineUserActionMetadata, { nullable: true })
}) {}

export class UserCommunicationDisabledActionMetadata extends S.Class<UserCommunicationDisabledActionMetadata>("UserCommunicationDisabledActionMetadata")({
  "duration_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(2419200)), { nullable: true })
}) {}

export class UserCommunicationDisabledAction extends S.Class<UserCommunicationDisabledAction>("UserCommunicationDisabledAction")({
  "type": S.Literal(3),
  "metadata": UserCommunicationDisabledActionMetadata
}) {}

export class DefaultKeywordListTriggerMetadata extends S.Class<DefaultKeywordListTriggerMetadata>("DefaultKeywordListTriggerMetadata")({
  "allow_list": S.optionalWith(S.Array(S.String.pipe(S.minLength(1), S.maxLength(60))).pipe(S.maxItems(1000)), { nullable: true }),
  "presets": S.optionalWith(S.Array(AutomodKeywordPresetType), { nullable: true })
}) {}

export class DefaultKeywordListUpsertRequest extends S.Class<DefaultKeywordListUpsertRequest>("DefaultKeywordListUpsertRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "event_type": AutomodEventType,
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.Literal(4),
  "trigger_metadata": DefaultKeywordListTriggerMetadata
}) {}

export class KeywordTriggerMetadata extends S.Class<KeywordTriggerMetadata>("KeywordTriggerMetadata")({
  "keyword_filter": S.optionalWith(S.Array(S.String.pipe(S.minLength(1), S.maxLength(60))).pipe(S.maxItems(1000)), { nullable: true }),
  "regex_patterns": S.optionalWith(S.Array(S.String.pipe(S.minLength(1), S.maxLength(260))).pipe(S.maxItems(10)), { nullable: true }),
  "allow_list": S.optionalWith(S.Array(S.String.pipe(S.minLength(1), S.maxLength(60))).pipe(S.maxItems(100)), { nullable: true })
}) {}

export class KeywordUpsertRequest extends S.Class<KeywordUpsertRequest>("KeywordUpsertRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "event_type": AutomodEventType,
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.Literal(1),
  "trigger_metadata": S.optionalWith(KeywordTriggerMetadata, { nullable: true })
}) {}

export class MLSpamTriggerMetadata extends S.Class<MLSpamTriggerMetadata>("MLSpamTriggerMetadata")({
  
}) {}

export class MLSpamUpsertRequest extends S.Class<MLSpamUpsertRequest>("MLSpamUpsertRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "event_type": AutomodEventType,
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.Literal(3),
  "trigger_metadata": S.optionalWith(MLSpamTriggerMetadata, { nullable: true })
}) {}

export class MentionSpamTriggerMetadata extends S.Class<MentionSpamTriggerMetadata>("MentionSpamTriggerMetadata")({
  "mention_total_limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(50)), { nullable: true }),
  "mention_raid_protection_enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class MentionSpamUpsertRequest extends S.Class<MentionSpamUpsertRequest>("MentionSpamUpsertRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "event_type": AutomodEventType,
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.Literal(5),
  "trigger_metadata": S.optionalWith(MentionSpamTriggerMetadata, { nullable: true })
}) {}

export class CreateAutoModerationRuleRequest extends S.Union(DefaultKeywordListUpsertRequest,
KeywordUpsertRequest,
MLSpamUpsertRequest,
MentionSpamUpsertRequest) {}

export class CreateAutoModerationRule200 extends S.Union(DefaultKeywordRuleResponse,
KeywordRuleResponse,
MLSpamRuleResponse,
MentionSpamRuleResponse,
SpamLinkRuleResponse) {}

export class GetAutoModerationRule200 extends S.Union(DefaultKeywordRuleResponse,
KeywordRuleResponse,
MLSpamRuleResponse,
MentionSpamRuleResponse,
SpamLinkRuleResponse) {}

export class DefaultKeywordListUpsertRequestPartial extends S.Class<DefaultKeywordListUpsertRequestPartial>("DefaultKeywordListUpsertRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "event_type": S.optionalWith(AutomodEventType, { nullable: true }),
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.optionalWith(S.Literal(4), { nullable: true }),
  "trigger_metadata": S.optionalWith(DefaultKeywordListTriggerMetadata, { nullable: true })
}) {}

export class KeywordUpsertRequestPartial extends S.Class<KeywordUpsertRequestPartial>("KeywordUpsertRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "event_type": S.optionalWith(AutomodEventType, { nullable: true }),
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.optionalWith(S.Literal(1), { nullable: true }),
  "trigger_metadata": S.optionalWith(KeywordTriggerMetadata, { nullable: true })
}) {}

export class MLSpamUpsertRequestPartial extends S.Class<MLSpamUpsertRequestPartial>("MLSpamUpsertRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "event_type": S.optionalWith(AutomodEventType, { nullable: true }),
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.optionalWith(S.Literal(3), { nullable: true }),
  "trigger_metadata": S.optionalWith(MLSpamTriggerMetadata, { nullable: true })
}) {}

export class MentionSpamUpsertRequestPartial extends S.Class<MentionSpamUpsertRequestPartial>("MentionSpamUpsertRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "event_type": S.optionalWith(AutomodEventType, { nullable: true }),
  "actions": S.optionalWith(S.NonEmptyArray(S.Union(BlockMessageAction,
FlagToChannelAction,
QuarantineUserAction,
UserCommunicationDisabledAction)).pipe(S.minItems(1), S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "exempt_roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(20)), { nullable: true }),
  "exempt_channels": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "trigger_type": S.optionalWith(S.Literal(5), { nullable: true }),
  "trigger_metadata": S.optionalWith(MentionSpamTriggerMetadata, { nullable: true })
}) {}

export class UpdateAutoModerationRuleRequest extends S.Union(DefaultKeywordListUpsertRequestPartial,
KeywordUpsertRequestPartial,
MLSpamUpsertRequestPartial,
MentionSpamUpsertRequestPartial) {}

export class UpdateAutoModerationRule200 extends S.Union(DefaultKeywordRuleResponse,
KeywordRuleResponse,
MLSpamRuleResponse,
MentionSpamRuleResponse,
SpamLinkRuleResponse) {}

export class ListGuildBansParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class GuildBanResponse extends S.Class<GuildBanResponse>("GuildBanResponse")({
  "user": UserResponse,
  "reason": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListGuildBans200 extends S.Array(GuildBanResponse) {}

export class BanUserFromGuildRequest extends S.Class<BanUserFromGuildRequest>("BanUserFromGuildRequest")({
  "delete_message_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(604800)), { nullable: true }),
  "delete_message_days": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(7)), { nullable: true })
}) {}

export class UnbanUserFromGuildRequest extends S.Class<UnbanUserFromGuildRequest>("UnbanUserFromGuildRequest")({
  
}) {}

export class BulkBanUsersRequest extends S.Class<BulkBanUsersRequest>("BulkBanUsersRequest")({
  "user_ids": S.Array(SnowflakeType).pipe(S.maxItems(200)),
  "delete_message_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(604800)), { nullable: true })
}) {}

export class BulkBanUsersResponse extends S.Class<BulkBanUsersResponse>("BulkBanUsersResponse")({
  "banned_users": S.Array(SnowflakeType),
  "failed_users": S.Array(SnowflakeType)
}) {}

export class ListGuildChannels200 extends S.Array(S.Union(GuildChannelResponse,
PrivateChannelResponse,
PrivateGroupChannelResponse,
ThreadResponse)) {}

export class CreateOrUpdateThreadTagRequest extends S.Class<CreateOrUpdateThreadTagRequest>("CreateOrUpdateThreadTagRequest")({
  "name": S.String.pipe(S.minLength(0), S.maxLength(50)),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "moderated": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class CreateGuildChannelRequest extends S.Class<CreateGuildChannelRequest>("CreateGuildChannelRequest")({
  "type": S.optionalWith(S.Literal(0, 2, 4, 5, 13, 14, 15), { nullable: true }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "position": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "topic": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(4096)), { nullable: true }),
  "bitrate": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(8000)), { nullable: true }),
  "user_limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "nsfw": S.optionalWith(S.Boolean, { nullable: true }),
  "rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "permission_overwrites": S.optionalWith(S.Array(ChannelPermissionOverwriteRequest).pipe(S.maxItems(100)), { nullable: true }),
  "rtc_region": S.optionalWith(S.String, { nullable: true }),
  "video_quality_mode": S.optionalWith(VideoQualityModes, { nullable: true }),
  "default_auto_archive_duration": S.optionalWith(ThreadAutoArchiveDuration, { nullable: true }),
  "default_reaction_emoji": S.optionalWith(UpdateDefaultReactionEmojiRequest, { nullable: true }),
  "default_thread_rate_limit_per_user": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(21600)), { nullable: true }),
  "default_sort_order": S.optionalWith(ThreadSortOrder, { nullable: true }),
  "default_forum_layout": S.optionalWith(ForumLayout, { nullable: true }),
  "default_tag_setting": S.optionalWith(ThreadSearchTagSetting, { nullable: true }),
  "available_tags": S.optionalWith(S.Array(S.Union(S.Null,
CreateOrUpdateThreadTagRequest)).pipe(S.maxItems(20)), { nullable: true })
}) {}

export class BulkUpdateGuildChannelsRequest extends S.Array(S.Struct({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "position": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "parent_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "lock_permissions": S.optionalWith(S.Boolean, { nullable: true })
})) {}

export class ListGuildEmojis200 extends S.Array(EmojiResponse) {}

export class CreateGuildEmojiRequest extends S.Class<CreateGuildEmojiRequest>("CreateGuildEmojiRequest")({
  "name": S.String.pipe(S.minLength(2), S.maxLength(32)),
  "image": S.String,
  "roles": S.optionalWith(S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(1521)), { nullable: true })
}) {}

export class UpdateGuildEmojiRequest extends S.Class<UpdateGuildEmojiRequest>("UpdateGuildEmojiRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(32)), { nullable: true }),
  "roles": S.optionalWith(S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(1521)), { nullable: true })
}) {}

export class IntegrationApplicationResponse extends S.Class<IntegrationApplicationResponse>("IntegrationApplicationResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String,
  "type": S.optionalWith(ApplicationTypes, { nullable: true }),
  "cover_image": S.optionalWith(S.String, { nullable: true }),
  "primary_sku_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "bot": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class DiscordIntegrationResponse extends S.Class<DiscordIntegrationResponse>("DiscordIntegrationResponse")({
  "type": S.Literal("discord"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse,
  "enabled": S.Boolean,
  "id": SnowflakeType,
  "application": IntegrationApplicationResponse,
  "scopes": S.Array(S.Literal("applications.commands", "bot", "webhook.incoming")),
  "user": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class IntegrationExpireBehaviorTypes extends S.Union(/**
* Remove role
*/
S.Literal(0),
S.Literal(1)) {}

export class IntegrationExpireGracePeriodTypes extends S.Union(/**
* 1 day
*/
S.Literal(1),
S.Literal(3),
S.Literal(7),
S.Literal(14),
S.Literal(30)) {}

export class ExternalConnectionIntegrationResponse extends S.Class<ExternalConnectionIntegrationResponse>("ExternalConnectionIntegrationResponse")({
  "type": S.Literal("twitch", "youtube"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse,
  "enabled": S.Boolean,
  "id": S.String,
  "user": UserResponse,
  "revoked": S.optionalWith(S.Boolean, { nullable: true }),
  "expire_behavior": S.optionalWith(IntegrationExpireBehaviorTypes, { nullable: true }),
  "expire_grace_period": S.optionalWith(IntegrationExpireGracePeriodTypes, { nullable: true }),
  "subscriber_count": S.optionalWith(S.Int, { nullable: true }),
  "synced_at": S.optionalWith(S.String, { nullable: true }),
  "role_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "syncing": S.optionalWith(S.Boolean, { nullable: true }),
  "enable_emoticons": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GuildSubscriptionIntegrationResponse extends S.Class<GuildSubscriptionIntegrationResponse>("GuildSubscriptionIntegrationResponse")({
  "type": S.Literal("guild_subscription"),
  "name": S.optionalWith(S.String, { nullable: true }),
  "account": AccountResponse,
  "enabled": S.Boolean,
  "id": SnowflakeType
}) {}

export class ListGuildIntegrations200 extends S.Array(S.Union(DiscordIntegrationResponse,
ExternalConnectionIntegrationResponse,
GuildSubscriptionIntegrationResponse)) {}

export class ListGuildInvites200 extends S.Array(S.Union(FriendInviteResponse,
GroupDMInviteResponse,
GuildInviteResponse,
S.Null)) {}

export class ListGuildMembersParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "after": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true })
}) {}

export class ListGuildMembers200 extends S.Array(GuildMemberResponse) {}

export class UpdateMyGuildMemberRequest extends S.Class<UpdateMyGuildMemberRequest>("UpdateMyGuildMemberRequest")({
  "nick": S.optionalWith(S.String.pipe(S.maxLength(32)), { nullable: true })
}) {}

export class PrivateGuildMemberResponse extends S.Class<PrivateGuildMemberResponse>("PrivateGuildMemberResponse")({
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "avatar_decoration_data": S.optionalWith(UserAvatarDecorationResponse, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "communication_disabled_until": S.optionalWith(S.String, { nullable: true }),
  "flags": S.Int,
  "joined_at": S.String,
  "nick": S.optionalWith(S.String, { nullable: true }),
  "pending": S.Boolean,
  "premium_since": S.optionalWith(S.String, { nullable: true }),
  "roles": S.Array(SnowflakeType),
  "collectibles": S.optionalWith(UserCollectiblesResponse, { nullable: true }),
  "user": UserResponse,
  "mute": S.Boolean,
  "deaf": S.Boolean,
  "permissions": S.optionalWith(S.String, { nullable: true })
}) {}

export class SearchGuildMembersParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "query": S.String.pipe(S.minLength(1), S.maxLength(100))
}) {}

export class SearchGuildMembers200 extends S.Array(GuildMemberResponse) {}

export class BotAddGuildMemberRequest extends S.Class<BotAddGuildMemberRequest>("BotAddGuildMemberRequest")({
  "nick": S.optionalWith(S.String.pipe(S.maxLength(32)), { nullable: true }),
  "roles": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(250)), { nullable: true }),
  "mute": S.optionalWith(S.Boolean, { nullable: true }),
  "deaf": S.optionalWith(S.Boolean, { nullable: true }),
  "access_token": S.String.pipe(S.maxLength(10240)),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class UpdateGuildMemberRequest extends S.Class<UpdateGuildMemberRequest>("UpdateGuildMemberRequest")({
  "nick": S.optionalWith(S.String.pipe(S.maxLength(32)), { nullable: true }),
  "roles": S.optionalWith(S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(350)), { nullable: true }),
  "mute": S.optionalWith(S.Boolean, { nullable: true }),
  "deaf": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "communication_disabled_until": S.optionalWith(S.String, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class WelcomeMessageResponse extends S.Class<WelcomeMessageResponse>("WelcomeMessageResponse")({
  "author_ids": S.Array(SnowflakeType),
  "message": S.String
}) {}

export class NewMemberActionType extends S.Union(S.Literal(0),
S.Literal(1)) {}

export class SettingsEmojiResponse extends S.Class<SettingsEmojiResponse>("SettingsEmojiResponse")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "name": S.optionalWith(S.String, { nullable: true }),
  "animated": S.Boolean
}) {}

export class NewMemberActionResponse extends S.Class<NewMemberActionResponse>("NewMemberActionResponse")({
  "channel_id": SnowflakeType,
  "action_type": NewMemberActionType,
  "title": S.String,
  "description": S.String,
  "emoji": S.optionalWith(SettingsEmojiResponse, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true })
}) {}

export class ResourceChannelResponse extends S.Class<ResourceChannelResponse>("ResourceChannelResponse")({
  "channel_id": SnowflakeType,
  "title": S.String,
  "emoji": S.optionalWith(SettingsEmojiResponse, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.String
}) {}

export class GuildHomeSettingsResponse extends S.Class<GuildHomeSettingsResponse>("GuildHomeSettingsResponse")({
  "guild_id": SnowflakeType,
  "enabled": S.Boolean,
  "welcome_message": S.optionalWith(WelcomeMessageResponse, { nullable: true }),
  "new_member_actions": S.Array(S.Union(S.Null,
NewMemberActionResponse)),
  "resource_channels": S.Array(S.Union(S.Null,
ResourceChannelResponse))
}) {}

export class OnboardingPromptOptionResponse extends S.Class<OnboardingPromptOptionResponse>("OnboardingPromptOptionResponse")({
  "id": SnowflakeType,
  "title": S.String,
  "description": S.String,
  "emoji": SettingsEmojiResponse,
  "role_ids": S.Array(SnowflakeType),
  "channel_ids": S.Array(SnowflakeType)
}) {}

export class OnboardingPromptType extends S.Union(/**
* Multiple choice options
*/
S.Literal(0),
S.Literal(1)) {}

export class OnboardingPromptResponse extends S.Class<OnboardingPromptResponse>("OnboardingPromptResponse")({
  "id": SnowflakeType,
  "title": S.String,
  "options": S.Array(OnboardingPromptOptionResponse),
  "single_select": S.Boolean,
  "required": S.Boolean,
  "in_onboarding": S.Boolean,
  "type": OnboardingPromptType
}) {}

export class UserGuildOnboardingResponse extends S.Class<UserGuildOnboardingResponse>("UserGuildOnboardingResponse")({
  "guild_id": SnowflakeType,
  "prompts": S.Array(OnboardingPromptResponse),
  "default_channel_ids": S.Array(SnowflakeType),
  "enabled": S.Boolean
}) {}

export class OnboardingPromptOptionRequest extends S.Class<OnboardingPromptOptionRequest>("OnboardingPromptOptionRequest")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "title": S.String.pipe(S.minLength(1), S.maxLength(50)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "emoji_animated": S.optionalWith(S.Boolean, { nullable: true }),
  "role_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true }),
  "channel_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(50)), { nullable: true })
}) {}

export class UpdateOnboardingPromptRequest extends S.Class<UpdateOnboardingPromptRequest>("UpdateOnboardingPromptRequest")({
  "title": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "options": S.NonEmptyArray(OnboardingPromptOptionRequest).pipe(S.minItems(1), S.maxItems(50)),
  "single_select": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "in_onboarding": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.optionalWith(OnboardingPromptType, { nullable: true }),
  "id": SnowflakeType
}) {}

export class GuildOnboardingMode extends S.Union(/**
* Only Default Channels considered in constraints
*/
S.Literal(0),
S.Literal(1)) {}

export class UpdateGuildOnboardingRequest extends S.Class<UpdateGuildOnboardingRequest>("UpdateGuildOnboardingRequest")({
  "prompts": S.optionalWith(S.Array(UpdateOnboardingPromptRequest).pipe(S.maxItems(15)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true }),
  "default_channel_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(500)), { nullable: true }),
  "mode": S.optionalWith(GuildOnboardingMode, { nullable: true })
}) {}

export class GuildOnboardingResponse extends S.Class<GuildOnboardingResponse>("GuildOnboardingResponse")({
  "guild_id": SnowflakeType,
  "prompts": S.Array(OnboardingPromptResponse),
  "default_channel_ids": S.Array(SnowflakeType),
  "enabled": S.Boolean
}) {}

export class GuildPreviewResponse extends S.Class<GuildPreviewResponse>("GuildPreviewResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "home_header": S.optionalWith(S.String, { nullable: true }),
  "splash": S.optionalWith(S.String, { nullable: true }),
  "discovery_splash": S.optionalWith(S.String, { nullable: true }),
  "features": S.Array(GuildFeatures),
  "approximate_member_count": S.Int,
  "approximate_presence_count": S.Int,
  "emojis": S.Array(EmojiResponse),
  "stickers": S.Array(GuildStickerResponse)
}) {}

export class PreviewPruneGuildParams extends S.Struct({
  "days": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(30)), { nullable: true }),
  "include_roles": S.optionalWith(S.Union(S.String,
S.Array(S.Union(S.Null,
SnowflakeType)).pipe(S.maxItems(100))), { nullable: true })
}) {}

export class GuildPruneResponse extends S.Class<GuildPruneResponse>("GuildPruneResponse")({
  "pruned": S.optionalWith(S.Int, { nullable: true })
}) {}

export class PruneGuildRequest extends S.Class<PruneGuildRequest>("PruneGuildRequest")({
  "days": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(30)), { nullable: true }),
  "compute_prune_count": S.optionalWith(S.Boolean, { nullable: true }),
  "include_roles": S.optionalWith(S.Union(S.String,
S.Array(SnowflakeType).pipe(S.maxItems(100))), { nullable: true })
}) {}

export class VoiceRegionResponse extends S.Class<VoiceRegionResponse>("VoiceRegionResponse")({
  "id": S.String,
  "name": S.String,
  "custom": S.Boolean,
  "deprecated": S.Boolean,
  "optimal": S.Boolean
}) {}

export class ListGuildVoiceRegions200 extends S.Array(VoiceRegionResponse) {}

export class ListGuildRoles200 extends S.Array(GuildRoleResponse) {}

export class CreateRoleRequest extends S.Class<CreateRoleRequest>("CreateRoleRequest")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "permissions": S.optionalWith(S.Int, { nullable: true }),
  "color": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(16777215)), { nullable: true }),
  "hoist": S.optionalWith(S.Boolean, { nullable: true }),
  "mentionable": S.optionalWith(S.Boolean, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "unicode_emoji": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true })
}) {}

export class UpdateRolePositionsRequest extends S.Class<UpdateRolePositionsRequest>("UpdateRolePositionsRequest")({
  "id": S.optionalWith(SnowflakeType, { nullable: true }),
  "position": S.optionalWith(S.Int, { nullable: true })
}) {}

export class BulkUpdateGuildRolesRequest extends S.Array(UpdateRolePositionsRequest) {}

export class BulkUpdateGuildRoles200 extends S.Array(GuildRoleResponse) {}

export class UpdateRoleRequestPartial extends S.Class<UpdateRoleRequestPartial>("UpdateRoleRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "permissions": S.optionalWith(S.Int, { nullable: true }),
  "color": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(16777215)), { nullable: true }),
  "hoist": S.optionalWith(S.Boolean, { nullable: true }),
  "mentionable": S.optionalWith(S.Boolean, { nullable: true }),
  "icon": S.optionalWith(S.String, { nullable: true }),
  "unicode_emoji": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true })
}) {}

export class ListGuildScheduledEventsParams extends S.Struct({
  "with_user_count": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListGuildScheduledEvents200 extends S.Array(S.Union(ExternalScheduledEventResponse,
StageScheduledEventResponse,
VoiceScheduledEventResponse)) {}

export class EntityMetadataExternal extends S.Class<EntityMetadataExternal>("EntityMetadataExternal")({
  "location": S.String.pipe(S.maxLength(100))
}) {}

export class ExternalScheduledEventCreateRequest extends S.Class<ExternalScheduledEventCreateRequest>("ExternalScheduledEventCreateRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "entity_type": S.Literal(3),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": EntityMetadataExternal
}) {}

export class EntityMetadataStageInstance extends S.Class<EntityMetadataStageInstance>("EntityMetadataStageInstance")({
  
}) {}

export class StageScheduledEventCreateRequest extends S.Class<StageScheduledEventCreateRequest>("StageScheduledEventCreateRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "entity_type": S.Literal(1),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataStageInstance, { nullable: true })
}) {}

export class EntityMetadataVoice extends S.Class<EntityMetadataVoice>("EntityMetadataVoice")({
  
}) {}

export class VoiceScheduledEventCreateRequest extends S.Class<VoiceScheduledEventCreateRequest>("VoiceScheduledEventCreateRequest")({
  "name": S.String.pipe(S.maxLength(100)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.String,
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "privacy_level": GuildScheduledEventPrivacyLevels,
  "entity_type": S.Literal(2),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataVoice, { nullable: true })
}) {}

export class CreateGuildScheduledEventRequest extends S.Union(ExternalScheduledEventCreateRequest,
StageScheduledEventCreateRequest,
VoiceScheduledEventCreateRequest) {}

export class CreateGuildScheduledEvent200 extends S.Union(ExternalScheduledEventResponse,
StageScheduledEventResponse,
VoiceScheduledEventResponse) {}

export class GetGuildScheduledEventParams extends S.Struct({
  "with_user_count": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GetGuildScheduledEvent200 extends S.Union(ExternalScheduledEventResponse,
StageScheduledEventResponse,
VoiceScheduledEventResponse) {}

export class ExternalScheduledEventPatchRequestPartial extends S.Class<ExternalScheduledEventPatchRequestPartial>("ExternalScheduledEventPatchRequestPartial")({
  "status": S.optionalWith(GuildScheduledEventStatuses, { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.optionalWith(S.String, { nullable: true }),
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "entity_type": S.optionalWith(S.Literal(3), { nullable: true }),
  "privacy_level": S.optionalWith(GuildScheduledEventPrivacyLevels, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataExternal, { nullable: true })
}) {}

export class StageScheduledEventPatchRequestPartial extends S.Class<StageScheduledEventPatchRequestPartial>("StageScheduledEventPatchRequestPartial")({
  "status": S.optionalWith(GuildScheduledEventStatuses, { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.optionalWith(S.String, { nullable: true }),
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "entity_type": S.optionalWith(S.Literal(1), { nullable: true }),
  "privacy_level": S.optionalWith(GuildScheduledEventPrivacyLevels, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataStageInstance, { nullable: true })
}) {}

export class VoiceScheduledEventPatchRequestPartial extends S.Class<VoiceScheduledEventPatchRequestPartial>("VoiceScheduledEventPatchRequestPartial")({
  "status": S.optionalWith(GuildScheduledEventStatuses, { nullable: true }),
  "name": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(1000)), { nullable: true }),
  "image": S.optionalWith(S.String, { nullable: true }),
  "scheduled_start_time": S.optionalWith(S.String, { nullable: true }),
  "scheduled_end_time": S.optionalWith(S.String, { nullable: true }),
  "entity_type": S.optionalWith(S.Literal(2), { nullable: true }),
  "privacy_level": S.optionalWith(GuildScheduledEventPrivacyLevels, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "entity_metadata": S.optionalWith(EntityMetadataVoice, { nullable: true })
}) {}

export class UpdateGuildScheduledEventRequest extends S.Union(ExternalScheduledEventPatchRequestPartial,
StageScheduledEventPatchRequestPartial,
VoiceScheduledEventPatchRequestPartial) {}

export class UpdateGuildScheduledEvent200 extends S.Union(ExternalScheduledEventResponse,
StageScheduledEventResponse,
VoiceScheduledEventResponse) {}

export class ListGuildScheduledEventUsersParams extends S.Struct({
  "with_member": S.optionalWith(S.Boolean, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(100)), { nullable: true }),
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class ListGuildScheduledEventUsers200 extends S.Array(ScheduledEventUserResponse) {}

export class SoundboardSoundResponse extends S.Class<SoundboardSoundResponse>("SoundboardSoundResponse")({
  "name": S.String,
  "sound_id": SnowflakeType,
  "volume": S.Number,
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "available": S.Boolean,
  "user": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class ListGuildSoundboardSoundsResponse extends S.Class<ListGuildSoundboardSoundsResponse>("ListGuildSoundboardSoundsResponse")({
  "items": S.Array(SoundboardSoundResponse)
}) {}

export class SoundboardCreateRequest extends S.Class<SoundboardCreateRequest>("SoundboardCreateRequest")({
  "name": S.String.pipe(S.minLength(2), S.maxLength(32)),
  "volume": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(32)), { nullable: true }),
  "sound": S.String
}) {}

export class SoundboardPatchRequestPartial extends S.Class<SoundboardPatchRequestPartial>("SoundboardPatchRequestPartial")({
  "name": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(32)), { nullable: true }),
  "volume": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(32)), { nullable: true })
}) {}

export class ListGuildStickers200 extends S.Array(GuildStickerResponse) {}

export class CreateGuildStickerRequest extends S.Class<CreateGuildStickerRequest>("CreateGuildStickerRequest")({
  "name": S.String.pipe(S.minLength(2), S.maxLength(30)),
  "tags": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "file": S.instanceOf(globalThis.Blob)
}) {}

export class UpdateGuildStickerRequest extends S.Class<UpdateGuildStickerRequest>("UpdateGuildStickerRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(30)), { nullable: true }),
  "tags": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(200)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true })
}) {}

export class ListGuildTemplates200 extends S.Array(GuildTemplateResponse) {}

export class CreateGuildTemplateRequest extends S.Class<CreateGuildTemplateRequest>("CreateGuildTemplateRequest")({
  "name": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "description": S.optionalWith(S.String.pipe(S.maxLength(120)), { nullable: true })
}) {}

export class UpdateGuildTemplateRequest extends S.Class<UpdateGuildTemplateRequest>("UpdateGuildTemplateRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(100)), { nullable: true }),
  "description": S.optionalWith(S.String.pipe(S.maxLength(120)), { nullable: true })
}) {}

export class VanityURLErrorResponse extends S.Class<VanityURLErrorResponse>("VanityURLErrorResponse")({
  "message": S.String,
  "code": S.Int
}) {}

export class VanityURLResponse extends S.Class<VanityURLResponse>("VanityURLResponse")({
  "code": S.optionalWith(S.String, { nullable: true }),
  "uses": S.Int,
  "error": S.optionalWith(VanityURLErrorResponse, { nullable: true })
}) {}

export class VoiceStateResponse extends S.Class<VoiceStateResponse>("VoiceStateResponse")({
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "deaf": S.Boolean,
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "member": S.optionalWith(GuildMemberResponse, { nullable: true }),
  "mute": S.Boolean,
  "request_to_speak_timestamp": S.optionalWith(S.String, { nullable: true }),
  "suppress": S.Boolean,
  "self_stream": S.optionalWith(S.Boolean, { nullable: true }),
  "self_deaf": S.Boolean,
  "self_mute": S.Boolean,
  "self_video": S.Boolean,
  "session_id": S.String,
  "user_id": SnowflakeType
}) {}

export class UpdateSelfVoiceStateRequestPartial extends S.Class<UpdateSelfVoiceStateRequestPartial>("UpdateSelfVoiceStateRequestPartial")({
  "request_to_speak_timestamp": S.optionalWith(S.String, { nullable: true }),
  "suppress": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateVoiceStateRequestPartial extends S.Class<UpdateVoiceStateRequestPartial>("UpdateVoiceStateRequestPartial")({
  "suppress": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class GetGuildWebhooks200 extends S.Array(S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse)) {}

export class GuildWelcomeScreenChannelResponse extends S.Class<GuildWelcomeScreenChannelResponse>("GuildWelcomeScreenChannelResponse")({
  "channel_id": SnowflakeType,
  "description": S.String,
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String, { nullable: true })
}) {}

export class GuildWelcomeScreenResponse extends S.Class<GuildWelcomeScreenResponse>("GuildWelcomeScreenResponse")({
  "description": S.optionalWith(S.String, { nullable: true }),
  "welcome_channels": S.Array(GuildWelcomeScreenChannelResponse)
}) {}

export class GuildWelcomeChannel extends S.Class<GuildWelcomeChannel>("GuildWelcomeChannel")({
  "channel_id": SnowflakeType,
  "description": S.String.pipe(S.minLength(1), S.maxLength(50)),
  "emoji_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "emoji_name": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true })
}) {}

export class WelcomeScreenPatchRequestPartial extends S.Class<WelcomeScreenPatchRequestPartial>("WelcomeScreenPatchRequestPartial")({
  "description": S.optionalWith(S.String.pipe(S.maxLength(140)), { nullable: true }),
  "welcome_channels": S.optionalWith(S.Array(GuildWelcomeChannel).pipe(S.maxItems(5)), { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class WidgetSettingsResponse extends S.Class<WidgetSettingsResponse>("WidgetSettingsResponse")({
  "enabled": S.Boolean,
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateGuildWidgetSettingsRequest extends S.Class<UpdateGuildWidgetSettingsRequest>("UpdateGuildWidgetSettingsRequest")({
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class WidgetChannel extends S.Class<WidgetChannel>("WidgetChannel")({
  "id": SnowflakeType,
  "name": S.String,
  "position": S.Int
}) {}

export class WidgetUserDiscriminator extends S.Literal("0000") {}

export class WidgetActivity extends S.Class<WidgetActivity>("WidgetActivity")({
  "name": S.String
}) {}

export class WidgetMember extends S.Class<WidgetMember>("WidgetMember")({
  "id": S.String,
  "username": S.String,
  "discriminator": WidgetUserDiscriminator,
  "avatar": S.optionalWith(S.Null, { nullable: true }),
  "status": S.String,
  "avatar_url": S.String,
  "activity": S.optionalWith(WidgetActivity, { nullable: true }),
  "deaf": S.optionalWith(S.Boolean, { nullable: true }),
  "mute": S.optionalWith(S.Boolean, { nullable: true }),
  "self_deaf": S.optionalWith(S.Boolean, { nullable: true }),
  "self_mute": S.optionalWith(S.Boolean, { nullable: true }),
  "suppress": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class WidgetResponse extends S.Class<WidgetResponse>("WidgetResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "instant_invite": S.optionalWith(S.String, { nullable: true }),
  "channels": S.Array(WidgetChannel),
  "members": S.Array(WidgetMember),
  "presence_count": S.Int
}) {}

export class WidgetImageStyles extends S.Union(/**
* shield style widget with Discord icon and guild members online count
*/
S.Literal("shield"),
S.Literal("banner1"),
S.Literal("banner2"),
S.Literal("banner3"),
S.Literal("banner4")) {}

export class GetGuildWidgetPngParams extends S.Struct({
  "style": S.optionalWith(WidgetImageStyles, { nullable: true })
}) {}

export class CreateInteractionResponseParams extends S.Struct({
  "with_response": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class InteractionCallbackTypes extends S.Union(S.Literal(1),
S.Literal(4),
S.Literal(5),
S.Literal(6),
S.Literal(7),
S.Literal(8),
S.Literal(9),
S.Literal(12)) {}

export class InteractionApplicationCommandAutocompleteCallbackIntegerData extends S.Class<InteractionApplicationCommandAutocompleteCallbackIntegerData>("InteractionApplicationCommandAutocompleteCallbackIntegerData")({
  "choices": S.optionalWith(S.Array(S.Union(S.Null,
ApplicationCommandOptionIntegerChoice)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class InteractionApplicationCommandAutocompleteCallbackNumberData extends S.Class<InteractionApplicationCommandAutocompleteCallbackNumberData>("InteractionApplicationCommandAutocompleteCallbackNumberData")({
  "choices": S.optionalWith(S.Array(S.Union(S.Null,
ApplicationCommandOptionNumberChoice)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class InteractionApplicationCommandAutocompleteCallbackStringData extends S.Class<InteractionApplicationCommandAutocompleteCallbackStringData>("InteractionApplicationCommandAutocompleteCallbackStringData")({
  "choices": S.optionalWith(S.Array(S.Union(S.Null,
ApplicationCommandOptionStringChoice)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class ApplicationCommandAutocompleteCallbackRequest extends S.Class<ApplicationCommandAutocompleteCallbackRequest>("ApplicationCommandAutocompleteCallbackRequest")({
  "type": S.Literal(8),
  "data": S.Union(InteractionApplicationCommandAutocompleteCallbackIntegerData,
InteractionApplicationCommandAutocompleteCallbackNumberData,
InteractionApplicationCommandAutocompleteCallbackStringData)
}) {}

export class IncomingWebhookInteractionRequest extends S.Class<IncomingWebhookInteractionRequest>("IncomingWebhookInteractionRequest")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(2000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "tts": S.optionalWith(S.Boolean, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class CreateMessageInteractionCallbackRequest extends S.Class<CreateMessageInteractionCallbackRequest>("CreateMessageInteractionCallbackRequest")({
  "type": S.Literal(4, 5),
  "data": S.optionalWith(IncomingWebhookInteractionRequest, { nullable: true })
}) {}

export class LaunchActivityInteractionCallbackRequest extends S.Class<LaunchActivityInteractionCallbackRequest>("LaunchActivityInteractionCallbackRequest")({
  "type": S.Literal(12)
}) {}

export class TextInputComponentForModalRequest extends S.Class<TextInputComponentForModalRequest>("TextInputComponentForModalRequest")({
  "type": S.Literal(4),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "style": TextInputStyleTypes,
  "label": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(45)), { nullable: true }),
  "value": S.optionalWith(S.String.pipe(S.maxLength(4000)), { nullable: true }),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "min_length": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(4000)), { nullable: true }),
  "max_length": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(4000)), { nullable: true })
}) {}

export class ActionRowComponentForModalRequest extends S.Class<ActionRowComponentForModalRequest>("ActionRowComponentForModalRequest")({
  "type": S.Literal(1),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "components": S.NonEmptyArray(TextInputComponentForModalRequest).pipe(S.minItems(1), S.maxItems(5))
}) {}

export class ChannelSelectComponentForModalRequest extends S.Class<ChannelSelectComponentForModalRequest>("ChannelSelectComponentForModalRequest")({
  "type": S.Literal(8),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(ChannelSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true }),
  "channel_types": S.optionalWith(S.Array(ChannelTypes), { nullable: true })
}) {}

export class FileUploadComponentForModalRequest extends S.Class<FileUploadComponentForModalRequest>("FileUploadComponentForModalRequest")({
  "type": S.Literal(19),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(10)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(10)), { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class MentionableSelectComponentForModalRequest extends S.Class<MentionableSelectComponentForModalRequest>("MentionableSelectComponentForModalRequest")({
  "type": S.Literal(7),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(S.Union(RoleSelectDefaultValue,
UserSelectDefaultValue)).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class RoleSelectComponentForModalRequest extends S.Class<RoleSelectComponentForModalRequest>("RoleSelectComponentForModalRequest")({
  "type": S.Literal(6),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(RoleSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class StringSelectComponentForModalRequest extends S.Class<StringSelectComponentForModalRequest>("StringSelectComponentForModalRequest")({
  "type": S.Literal(3),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "options": S.NonEmptyArray(StringSelectOptionForRequest).pipe(S.minItems(1), S.maxItems(25))
}) {}

export class UserSelectComponentForModalRequest extends S.Class<UserSelectComponentForModalRequest>("UserSelectComponentForModalRequest")({
  "type": S.Literal(5),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "placeholder": S.optionalWith(S.String.pipe(S.maxLength(150)), { nullable: true }),
  "min_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(25)), { nullable: true }),
  "max_values": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(25)), { nullable: true }),
  "disabled": S.optionalWith(S.Boolean, { nullable: true }),
  "required": S.optionalWith(S.Boolean, { nullable: true }),
  "default_values": S.optionalWith(S.Array(UserSelectDefaultValue).pipe(S.maxItems(25)), { nullable: true })
}) {}

export class LabelComponentForModalRequest extends S.Class<LabelComponentForModalRequest>("LabelComponentForModalRequest")({
  "type": S.Literal(18),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "label": S.String.pipe(S.minLength(1), S.maxLength(45)),
  "description": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(100)), { nullable: true }),
  "component": S.Union(ChannelSelectComponentForModalRequest,
FileUploadComponentForModalRequest,
MentionableSelectComponentForModalRequest,
RoleSelectComponentForModalRequest,
StringSelectComponentForModalRequest,
TextInputComponentForModalRequest,
UserSelectComponentForModalRequest)
}) {}

export class TextDisplayComponentForModalRequest extends S.Class<TextDisplayComponentForModalRequest>("TextDisplayComponentForModalRequest")({
  "type": S.Literal(10),
  "id": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "content": S.String.pipe(S.minLength(1), S.maxLength(4000))
}) {}

export class ModalInteractionCallbackRequestData extends S.Class<ModalInteractionCallbackRequestData>("ModalInteractionCallbackRequestData")({
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(100)),
  "title": S.String.pipe(S.minLength(1), S.maxLength(45)),
  "components": S.NonEmptyArray(S.Union(ActionRowComponentForModalRequest,
LabelComponentForModalRequest,
TextDisplayComponentForModalRequest)).pipe(S.minItems(1), S.maxItems(40))
}) {}

export class ModalInteractionCallbackRequest extends S.Class<ModalInteractionCallbackRequest>("ModalInteractionCallbackRequest")({
  "type": S.Literal(9),
  "data": ModalInteractionCallbackRequestData
}) {}

export class PongInteractionCallbackRequest extends S.Class<PongInteractionCallbackRequest>("PongInteractionCallbackRequest")({
  "type": S.Literal(1)
}) {}

export class IncomingWebhookUpdateForInteractionCallbackRequestPartial extends S.Class<IncomingWebhookUpdateForInteractionCallbackRequestPartial>("IncomingWebhookUpdateForInteractionCallbackRequestPartial")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(2000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class UpdateMessageInteractionCallbackRequest extends S.Class<UpdateMessageInteractionCallbackRequest>("UpdateMessageInteractionCallbackRequest")({
  "type": S.Literal(6, 7),
  "data": S.optionalWith(IncomingWebhookUpdateForInteractionCallbackRequestPartial, { nullable: true })
}) {}

export class CreateInteractionResponseRequest extends S.Union(ApplicationCommandAutocompleteCallbackRequest,
CreateMessageInteractionCallbackRequest,
LaunchActivityInteractionCallbackRequest,
ModalInteractionCallbackRequest,
PongInteractionCallbackRequest,
UpdateMessageInteractionCallbackRequest) {}

export class InteractionResponse extends S.Class<InteractionResponse>("InteractionResponse")({
  "id": SnowflakeType,
  "type": InteractionTypes,
  "response_message_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "response_message_loading": S.optionalWith(S.Boolean, { nullable: true }),
  "response_message_ephemeral": S.optionalWith(S.Boolean, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "guild_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class CreateMessageInteractionCallbackResponse extends S.Class<CreateMessageInteractionCallbackResponse>("CreateMessageInteractionCallbackResponse")({
  "type": S.Literal(4),
  "message": MessageResponse
}) {}

export class LaunchActivityInteractionCallbackResponse extends S.Class<LaunchActivityInteractionCallbackResponse>("LaunchActivityInteractionCallbackResponse")({
  "type": S.Literal(12)
}) {}

export class UpdateMessageInteractionCallbackResponse extends S.Class<UpdateMessageInteractionCallbackResponse>("UpdateMessageInteractionCallbackResponse")({
  "type": S.Literal(7),
  "message": MessageResponse
}) {}

export class InteractionCallbackResponse extends S.Class<InteractionCallbackResponse>("InteractionCallbackResponse")({
  "interaction": InteractionResponse,
  "resource": S.optionalWith(S.Union(CreateMessageInteractionCallbackResponse,
LaunchActivityInteractionCallbackResponse,
UpdateMessageInteractionCallbackResponse), { nullable: true })
}) {}

export class InviteResolveParams extends S.Struct({
  "with_counts": S.optionalWith(S.Boolean, { nullable: true }),
  "guild_scheduled_event_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class InviteResolve200 extends S.Union(FriendInviteResponse,
GroupDMInviteResponse,
GuildInviteResponse) {}

export class InviteRevoke200 extends S.Union(FriendInviteResponse,
GroupDMInviteResponse,
GuildInviteResponse) {}

export class CreateOrJoinLobbyRequestFlagsEnum extends S.Literal(1) {}

export class CreateOrJoinLobbyRequest extends S.Class<CreateOrJoinLobbyRequest>("CreateOrJoinLobbyRequest")({
  "idle_timeout_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(5), S.lessThanOrEqualTo(604800)), { nullable: true }),
  "lobby_metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "member_metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "secret": S.String.pipe(S.maxLength(250)),
  "flags": S.optionalWith(CreateOrJoinLobbyRequestFlagsEnum, { nullable: true })
}) {}

export class LobbyMemberResponse extends S.Class<LobbyMemberResponse>("LobbyMemberResponse")({
  "id": SnowflakeType,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.Int
}) {}

export class LobbyResponse extends S.Class<LobbyResponse>("LobbyResponse")({
  "id": SnowflakeType,
  "application_id": SnowflakeType,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "members": S.Array(LobbyMemberResponse),
  "linked_channel": S.optionalWith(GuildChannelResponse, { nullable: true }),
  "flags": UInt32Type,
  "override_event_webhooks_url": S.optionalWith(S.String, { nullable: true })
}) {}

export class LobbyMemberRequestFlagsEnum extends S.Literal(1) {}

export class LobbyMemberRequest extends S.Class<LobbyMemberRequest>("LobbyMemberRequest")({
  "id": SnowflakeType,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.optionalWith(LobbyMemberRequestFlagsEnum, { nullable: true })
}) {}

export class CreateLobbyRequestFlagsEnum extends S.Literal(1) {}

export class CreateLobbyRequest extends S.Class<CreateLobbyRequest>("CreateLobbyRequest")({
  "idle_timeout_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(5), S.lessThanOrEqualTo(604800)), { nullable: true }),
  "members": S.optionalWith(S.Array(LobbyMemberRequest).pipe(S.maxItems(25)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.optionalWith(CreateLobbyRequestFlagsEnum, { nullable: true }),
  "override_event_webhooks_url": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true })
}) {}

export class EditLobbyRequestFlagsEnum extends S.Literal(1) {}

export class EditLobbyRequest extends S.Class<EditLobbyRequest>("EditLobbyRequest")({
  "idle_timeout_seconds": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(5), S.lessThanOrEqualTo(604800)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "members": S.optionalWith(S.Array(LobbyMemberRequest).pipe(S.maxItems(25)), { nullable: true }),
  "flags": S.optionalWith(EditLobbyRequestFlagsEnum, { nullable: true }),
  "override_event_webhooks_url": S.optionalWith(S.String.pipe(S.maxLength(512)), { nullable: true })
}) {}

export class EditLobbyChannelLinkRequest extends S.Class<EditLobbyChannelLinkRequest>("EditLobbyChannelLinkRequest")({
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class LobbyGuildInviteResponse extends S.Class<LobbyGuildInviteResponse>("LobbyGuildInviteResponse")({
  "code": S.String
}) {}

export class BulkLobbyMemberRequestFlagsEnum extends S.Literal(1) {}

export class BulkLobbyMemberRequest extends S.Class<BulkLobbyMemberRequest>("BulkLobbyMemberRequest")({
  "id": SnowflakeType,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.optionalWith(BulkLobbyMemberRequestFlagsEnum, { nullable: true }),
  "remove_member": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BulkUpdateLobbyMembersRequest extends S.NonEmptyArray(BulkLobbyMemberRequest).pipe(S.minItems(1), S.maxItems(25)) {}

export class BulkUpdateLobbyMembers200 extends S.Array(LobbyMemberResponse) {}

export class AddLobbyMemberRequestFlagsEnum extends S.Literal(1) {}

export class AddLobbyMemberRequest extends S.Class<AddLobbyMemberRequest>("AddLobbyMemberRequest")({
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.optionalWith(AddLobbyMemberRequestFlagsEnum, { nullable: true })
}) {}

export class GetLobbyMessagesParams extends S.Struct({
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(200)), { nullable: true })
}) {}

export class LobbyMessageResponse extends S.Class<LobbyMessageResponse>("LobbyMessageResponse")({
  "id": SnowflakeType,
  "type": MessageType,
  "content": S.String,
  "lobby_id": SnowflakeType,
  "channel_id": SnowflakeType,
  "author": UserResponse,
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "flags": S.Int,
  "application_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class GetLobbyMessages200 extends S.Array(LobbyMessageResponse) {}

export class SDKMessageRequest extends S.Class<SDKMessageRequest>("SDKMessageRequest")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(4000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "sticker_ids": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(3)), { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "shared_client_theme": S.optionalWith(CustomClientThemeShareRequest, { nullable: true }),
  "confetti_potion": S.optionalWith(ConfettiPotionCreateRequest, { nullable: true }),
  "message_reference": S.optionalWith(MessageReferenceRequest, { nullable: true }),
  "nonce": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(-9223372036854776000), S.lessThanOrEqualTo(9223372036854776000)),
S.String.pipe(S.maxLength(25))), { nullable: true }),
  "enforce_nonce": S.optionalWith(S.Boolean, { nullable: true }),
  "tts": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class OAuth2GetAuthorizationResponse extends S.Class<OAuth2GetAuthorizationResponse>("OAuth2GetAuthorizationResponse")({
  "application": ApplicationResponse,
  "expires": S.String,
  "scopes": S.Array(OAuth2Scopes),
  "user": S.optionalWith(UserResponse, { nullable: true })
}) {}

export class OAuth2Key extends S.Class<OAuth2Key>("OAuth2Key")({
  "kty": S.String,
  "use": S.String,
  "kid": S.String,
  "n": S.String,
  "e": S.String,
  "alg": S.String
}) {}

export class OAuth2GetKeys extends S.Class<OAuth2GetKeys>("OAuth2GetKeys")({
  "keys": S.Array(OAuth2Key)
}) {}

export class OAuth2GetOpenIDConnectUserInfoResponse extends S.Class<OAuth2GetOpenIDConnectUserInfoResponse>("OAuth2GetOpenIDConnectUserInfoResponse")({
  "sub": S.String,
  "email": S.optionalWith(S.String, { nullable: true }),
  "email_verified": S.optionalWith(S.Boolean, { nullable: true }),
  "preferred_username": S.optionalWith(S.String, { nullable: true }),
  "nickname": S.optionalWith(S.String, { nullable: true }),
  "picture": S.optionalWith(S.String, { nullable: true }),
  "locale": S.optionalWith(S.String, { nullable: true })
}) {}

export class ApplicationIdentityProviderAuthType extends S.Union(S.Literal("OIDC"),
S.Literal("EPIC_ONLINE_SERVICES_ACCESS_TOKEN"),
S.Literal("EPIC_ONLINE_SERVICES_ID_TOKEN"),
S.Literal("STEAM_SESSION_TICKET"),
S.Literal("UNITY_SERVICES_ID_TOKEN"),
S.Literal("DISCORD_BOT_ISSUED_ACCESS_TOKEN"),
S.Literal("APPLE_ID_TOKEN"),
S.Literal("PLAYSTATION_NETWORK_ID_TOKEN")) {}

export class PartnerSdkUnmergeProvisionalAccountRequest extends S.Class<PartnerSdkUnmergeProvisionalAccountRequest>("PartnerSdkUnmergeProvisionalAccountRequest")({
  "client_id": SnowflakeType,
  "client_secret": S.optionalWith(S.String.pipe(S.maxLength(1024)), { nullable: true }),
  "external_auth_token": S.String.pipe(S.maxLength(10240)),
  "external_auth_type": ApplicationIdentityProviderAuthType
}) {}

export class BotPartnerSdkUnmergeProvisionalAccountRequest extends S.Class<BotPartnerSdkUnmergeProvisionalAccountRequest>("BotPartnerSdkUnmergeProvisionalAccountRequest")({
  "external_user_id": S.String.pipe(S.maxLength(1024))
}) {}

export class PartnerSdkTokenRequest extends S.Class<PartnerSdkTokenRequest>("PartnerSdkTokenRequest")({
  "client_id": SnowflakeType,
  "client_secret": S.optionalWith(S.String.pipe(S.maxLength(1024)), { nullable: true }),
  "external_auth_token": S.String.pipe(S.maxLength(10240)),
  "external_auth_type": ApplicationIdentityProviderAuthType
}) {}

export class ProvisionalTokenResponse extends S.Class<ProvisionalTokenResponse>("ProvisionalTokenResponse")({
  "token_type": S.String,
  "access_token": S.String,
  "expires_in": S.Int,
  "scope": S.String,
  "id_token": S.String,
  "refresh_token": S.optionalWith(S.String, { nullable: true }),
  "scopes": S.optionalWith(S.Array(S.String), { nullable: true }),
  "expires_at_s": S.optionalWith(S.Int, { nullable: true })
}) {}

export class BotPartnerSdkTokenRequest extends S.Class<BotPartnerSdkTokenRequest>("BotPartnerSdkTokenRequest")({
  "external_user_id": S.String.pipe(S.maxLength(1024)),
  "preferred_global_name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(32)), { nullable: true })
}) {}

export class GetSoundboardDefaultSounds200 extends S.Array(SoundboardSoundResponse) {}

export class StageInstancesPrivacyLevels extends S.Union(/**
* The Stage instance is visible publicly. (deprecated)
*/
S.Literal(1),
S.Literal(2)) {}

export class CreateStageInstanceRequest extends S.Class<CreateStageInstanceRequest>("CreateStageInstanceRequest")({
  "topic": S.String.pipe(S.minLength(1), S.maxLength(120)),
  "channel_id": SnowflakeType,
  "privacy_level": S.optionalWith(StageInstancesPrivacyLevels, { nullable: true }),
  "guild_scheduled_event_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "send_start_notification": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class StageInstanceResponse extends S.Class<StageInstanceResponse>("StageInstanceResponse")({
  "guild_id": SnowflakeType,
  "channel_id": SnowflakeType,
  "topic": S.String,
  "privacy_level": StageInstancesPrivacyLevels,
  "id": SnowflakeType,
  "discoverable_disabled": S.Boolean,
  "guild_scheduled_event_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateStageInstanceRequest extends S.Class<UpdateStageInstanceRequest>("UpdateStageInstanceRequest")({
  "topic": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(120)), { nullable: true }),
  "privacy_level": S.optionalWith(StageInstancesPrivacyLevels, { nullable: true })
}) {}

export class StickerPackResponse extends S.Class<StickerPackResponse>("StickerPackResponse")({
  "id": SnowflakeType,
  "sku_id": SnowflakeType,
  "name": S.String,
  "description": S.optionalWith(S.String, { nullable: true }),
  "stickers": S.Array(StandardStickerResponse),
  "cover_sticker_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "banner_asset_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class StickerPackCollectionResponse extends S.Class<StickerPackCollectionResponse>("StickerPackCollectionResponse")({
  "sticker_packs": S.Array(StickerPackResponse)
}) {}

export class GetSticker200 extends S.Union(GuildStickerResponse,
StandardStickerResponse) {}

export class PremiumTypes extends S.Union(/**
* None
*/
S.Literal(0),
S.Literal(1),
S.Literal(2),
S.Literal(3)) {}

export class UserPIIResponse extends S.Class<UserPIIResponse>("UserPIIResponse")({
  "id": SnowflakeType,
  "username": S.String,
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "discriminator": S.String,
  "public_flags": S.Int,
  "flags": Int53Type,
  "bot": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Boolean, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "accent_color": S.optionalWith(S.Int, { nullable: true }),
  "global_name": S.optionalWith(S.String, { nullable: true }),
  "avatar_decoration_data": S.optionalWith(UserAvatarDecorationResponse, { nullable: true }),
  "collectibles": S.optionalWith(UserCollectiblesResponse, { nullable: true }),
  "primary_guild": S.optionalWith(UserPrimaryGuildResponse, { nullable: true }),
  "mfa_enabled": S.Boolean,
  "locale": AvailableLocalesEnum,
  "premium_type": S.optionalWith(PremiumTypes, { nullable: true }),
  "email": S.optionalWith(S.String, { nullable: true }),
  "verified": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BotAccountPatchRequest extends S.Class<BotAccountPatchRequest>("BotAccountPatchRequest")({
  "username": S.String.pipe(S.minLength(2), S.maxLength(32)),
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true })
}) {}

export class ApplicationUserRoleConnectionResponse extends S.Class<ApplicationUserRoleConnectionResponse>("ApplicationUserRoleConnectionResponse")({
  "platform_name": S.optionalWith(S.String, { nullable: true }),
  "platform_username": S.optionalWith(S.String, { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class UpdateApplicationUserRoleConnectionRequest extends S.Class<UpdateApplicationUserRoleConnectionRequest>("UpdateApplicationUserRoleConnectionRequest")({
  "platform_name": S.optionalWith(S.String.pipe(S.maxLength(50)), { nullable: true }),
  "platform_username": S.optionalWith(S.String.pipe(S.maxLength(100)), { nullable: true }),
  "metadata": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class CreatePrivateChannelRequest extends S.Class<CreatePrivateChannelRequest>("CreatePrivateChannelRequest")({
  "recipient_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "access_tokens": S.optionalWith(S.Array(S.String.pipe(S.maxLength(152133))).pipe(S.maxItems(1521)), { nullable: true }),
  "nicks": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true })
}) {}

export class CreateDm200 extends S.Union(PrivateChannelResponse,
PrivateGroupChannelResponse) {}

export class ConnectedAccountProviders extends S.Union(S.Literal("battlenet"),
S.Literal("bluesky"),
S.Literal("bungie"),
S.Literal("ebay"),
S.Literal("epicgames"),
S.Literal("facebook"),
S.Literal("github"),
S.Literal("instagram"),
S.Literal("mastodon"),
S.Literal("leagueoflegends"),
S.Literal("paypal"),
S.Literal("playstation"),
S.Literal("reddit"),
S.Literal("riotgames"),
S.Literal("roblox"),
S.Literal("skype"),
S.Literal("spotify"),
S.Literal("steam"),
S.Literal("tiktok"),
S.Literal("twitch"),
S.Literal("twitter"),
S.Literal("xbox"),
S.Literal("youtube"),
S.Literal("domain")) {}

export class ConnectedAccountGuildResponse extends S.Class<ConnectedAccountGuildResponse>("ConnectedAccountGuildResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true })
}) {}

export class ConnectedAccountIntegrationResponse extends S.Class<ConnectedAccountIntegrationResponse>("ConnectedAccountIntegrationResponse")({
  "id": S.String,
  "type": IntegrationTypes,
  "account": AccountResponse,
  "guild": ConnectedAccountGuildResponse
}) {}

export class ConnectedAccountVisibility extends S.Union(S.Literal(0),
S.Literal(1)) {}

export class ConnectedAccountResponse extends S.Class<ConnectedAccountResponse>("ConnectedAccountResponse")({
  "id": S.String,
  "name": S.optionalWith(S.String, { nullable: true }),
  "type": ConnectedAccountProviders,
  "friend_sync": S.Boolean,
  "integrations": S.optionalWith(S.Array(ConnectedAccountIntegrationResponse), { nullable: true }),
  "show_activity": S.Boolean,
  "two_way_link": S.Boolean,
  "verified": S.Boolean,
  "visibility": ConnectedAccountVisibility,
  "revoked": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ListMyConnections200 extends S.Array(ConnectedAccountResponse) {}

export class ListMyGuildsParams extends S.Struct({
  "before": S.optionalWith(SnowflakeType, { nullable: true }),
  "after": S.optionalWith(SnowflakeType, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(200)), { nullable: true }),
  "with_counts": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class MyGuildResponse extends S.Class<MyGuildResponse>("MyGuildResponse")({
  "id": SnowflakeType,
  "name": S.String,
  "icon": S.optionalWith(S.String, { nullable: true }),
  "banner": S.optionalWith(S.String, { nullable: true }),
  "owner": S.Boolean,
  "permissions": S.String,
  "features": S.Array(GuildFeatures),
  "approximate_member_count": S.optionalWith(S.Int, { nullable: true }),
  "approximate_presence_count": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ListMyGuilds200 extends S.Array(MyGuildResponse) {}

export class ListVoiceRegions200 extends S.Array(VoiceRegionResponse) {}

export class GetWebhook200 extends S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse) {}

export class UpdateWebhookRequest extends S.Class<UpdateWebhookRequest>("UpdateWebhookRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(80)), { nullable: true }),
  "avatar": S.optionalWith(S.String, { nullable: true }),
  "channel_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateWebhook200 extends S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse) {}

export class GetWebhookByToken200 extends S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse) {}

export class ExecuteWebhookParams extends S.Struct({
  "wait": S.optionalWith(S.Boolean, { nullable: true }),
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "with_components": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class IncomingWebhookRequestPartial extends S.Class<IncomingWebhookRequestPartial>("IncomingWebhookRequestPartial")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(2000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "tts": S.optionalWith(S.Boolean, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true }),
  "username": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(80)), { nullable: true }),
  "avatar_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "thread_name": S.optionalWith(S.String.pipe(S.minLength(0), S.maxLength(100)), { nullable: true }),
  "applied_tags": S.optionalWith(S.Array(SnowflakeType).pipe(S.maxItems(5)), { nullable: true })
}) {}

export class IncomingWebhookUpdateRequestPartial extends S.Class<IncomingWebhookUpdateRequestPartial>("IncomingWebhookUpdateRequestPartial")({
  "content": S.optionalWith(S.String.pipe(S.maxLength(2000)), { nullable: true }),
  "embeds": S.optionalWith(S.Array(RichEmbed).pipe(S.maxItems(10)), { nullable: true }),
  "allowed_mentions": S.optionalWith(MessageAllowedMentionsRequest, { nullable: true }),
  "components": S.optionalWith(S.Array(S.Union(ActionRowComponentForMessageRequest,
ContainerComponentForMessageRequest,
FileComponentForMessageRequest,
MediaGalleryComponentForMessageRequest,
SectionComponentForMessageRequest,
SeparatorComponentForMessageRequest,
TextDisplayComponentForMessageRequest)).pipe(S.maxItems(40)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(MessageAttachmentRequest).pipe(S.maxItems(10)), { nullable: true }),
  "poll": S.optionalWith(PollCreateRequest, { nullable: true }),
  "flags": S.optionalWith(S.Int, { nullable: true })
}) {}

export class ExecuteWebhookRequest extends S.Union(IncomingWebhookRequestPartial,
IncomingWebhookUpdateRequestPartial) {}

export class UpdateWebhookByTokenRequest extends S.Class<UpdateWebhookByTokenRequest>("UpdateWebhookByTokenRequest")({
  "name": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(80)), { nullable: true }),
  "avatar": S.optionalWith(S.String, { nullable: true })
}) {}

export class UpdateWebhookByToken200 extends S.Union(ApplicationIncomingWebhookResponse,
ChannelFollowerWebhookResponse,
GuildIncomingWebhookResponse) {}

export class ExecuteGithubCompatibleWebhookParams extends S.Struct({
  "wait": S.optionalWith(S.Boolean, { nullable: true }),
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class GithubUser extends S.Class<GithubUser>("GithubUser")({
  "id": S.Int,
  "login": S.String.pipe(S.maxLength(152133)),
  "html_url": S.String.pipe(S.maxLength(2048)),
  "avatar_url": S.String.pipe(S.maxLength(2048))
}) {}

export class GithubComment extends S.Class<GithubComment>("GithubComment")({
  "id": S.Int,
  "html_url": S.String.pipe(S.maxLength(2048)),
  "user": GithubUser,
  "commit_id": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "body": S.String.pipe(S.maxLength(152133))
}) {}

export class GithubIssue extends S.Class<GithubIssue>("GithubIssue")({
  "id": S.Int,
  "number": S.Int,
  "html_url": S.String.pipe(S.maxLength(2048)),
  "user": GithubUser,
  "title": S.String.pipe(S.maxLength(152133)),
  "body": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true })
}) {}

export class GithubRepository extends S.Class<GithubRepository>("GithubRepository")({
  "id": S.Int,
  "html_url": S.String.pipe(S.maxLength(2048)),
  "name": S.String.pipe(S.maxLength(152133)),
  "full_name": S.String.pipe(S.maxLength(152133))
}) {}

export class GithubRelease extends S.Class<GithubRelease>("GithubRelease")({
  "id": S.Int,
  "tag_name": S.String.pipe(S.maxLength(152133)),
  "html_url": S.String.pipe(S.maxLength(2048)),
  "author": GithubUser
}) {}

export class GithubAuthor extends S.Class<GithubAuthor>("GithubAuthor")({
  "username": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "name": S.String.pipe(S.maxLength(152133))
}) {}

export class GithubCommit extends S.Class<GithubCommit>("GithubCommit")({
  "id": S.String.pipe(S.maxLength(152133)),
  "url": S.String.pipe(S.maxLength(2048)),
  "message": S.String.pipe(S.maxLength(152133)),
  "author": GithubAuthor
}) {}

export class GithubReview extends S.Class<GithubReview>("GithubReview")({
  "user": GithubUser,
  "body": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "html_url": S.String.pipe(S.maxLength(2048)),
  "state": S.String.pipe(S.maxLength(152133))
}) {}

export class GithubCheckPullRequest extends S.Class<GithubCheckPullRequest>("GithubCheckPullRequest")({
  "number": S.Int
}) {}

export class GithubCheckApp extends S.Class<GithubCheckApp>("GithubCheckApp")({
  "name": S.String.pipe(S.maxLength(152133))
}) {}

export class GithubCheckSuite extends S.Class<GithubCheckSuite>("GithubCheckSuite")({
  "conclusion": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "head_branch": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "head_sha": S.String.pipe(S.maxLength(152133)),
  "pull_requests": S.optionalWith(S.Array(GithubCheckPullRequest).pipe(S.maxItems(1521)), { nullable: true }),
  "app": GithubCheckApp
}) {}

export class GithubCheckRunOutput extends S.Class<GithubCheckRunOutput>("GithubCheckRunOutput")({
  "title": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "summary": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true })
}) {}

export class GithubCheckRun extends S.Class<GithubCheckRun>("GithubCheckRun")({
  "conclusion": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "name": S.String.pipe(S.maxLength(152133)),
  "html_url": S.String.pipe(S.maxLength(2048)),
  "check_suite": GithubCheckSuite,
  "details_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "output": S.optionalWith(GithubCheckRunOutput, { nullable: true }),
  "pull_requests": S.optionalWith(S.Array(GithubCheckPullRequest).pipe(S.maxItems(1521)), { nullable: true })
}) {}

export class GithubDiscussion extends S.Class<GithubDiscussion>("GithubDiscussion")({
  "title": S.String.pipe(S.maxLength(152133)),
  "number": S.Int,
  "html_url": S.String.pipe(S.maxLength(2048)),
  "answer_html_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "body": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "user": GithubUser
}) {}

export class GithubWebhook extends S.Class<GithubWebhook>("GithubWebhook")({
  "action": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "ref": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "ref_type": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "comment": S.optionalWith(GithubComment, { nullable: true }),
  "issue": S.optionalWith(GithubIssue, { nullable: true }),
  "pull_request": S.optionalWith(GithubIssue, { nullable: true }),
  "repository": S.optionalWith(GithubRepository, { nullable: true }),
  "forkee": S.optionalWith(GithubRepository, { nullable: true }),
  "sender": GithubUser,
  "member": S.optionalWith(GithubUser, { nullable: true }),
  "release": S.optionalWith(GithubRelease, { nullable: true }),
  "head_commit": S.optionalWith(GithubCommit, { nullable: true }),
  "commits": S.optionalWith(S.Array(GithubCommit).pipe(S.maxItems(1521)), { nullable: true }),
  "forced": S.optionalWith(S.Boolean, { nullable: true }),
  "compare": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "review": S.optionalWith(GithubReview, { nullable: true }),
  "check_run": S.optionalWith(GithubCheckRun, { nullable: true }),
  "check_suite": S.optionalWith(GithubCheckSuite, { nullable: true }),
  "discussion": S.optionalWith(GithubDiscussion, { nullable: true }),
  "answer": S.optionalWith(GithubComment, { nullable: true })
}) {}

export class GetOriginalWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class DeleteOriginalWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateOriginalWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "with_components": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class GetWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class DeleteWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class UpdateWebhookMessageParams extends S.Struct({
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true }),
  "with_components": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ExecuteSlackCompatibleWebhookParams extends S.Struct({
  "wait": S.optionalWith(S.Boolean, { nullable: true }),
  "thread_id": S.optionalWith(SnowflakeType, { nullable: true })
}) {}

export class WebhookSlackEmbedField extends S.Class<WebhookSlackEmbedField>("WebhookSlackEmbedField")({
  "name": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "value": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "inline": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class WebhookSlackEmbed extends S.Class<WebhookSlackEmbed>("WebhookSlackEmbed")({
  "title": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "title_link": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "text": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "color": S.optionalWith(S.String.pipe(S.maxLength(7), S.pattern(new RegExp("^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$"))), { nullable: true }),
  "ts": S.optionalWith(S.Int, { nullable: true }),
  "pretext": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "footer": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "footer_icon": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "author_name": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "author_link": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "author_icon": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "image_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "thumb_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "fields": S.optionalWith(S.Array(WebhookSlackEmbedField).pipe(S.maxItems(1521)), { nullable: true })
}) {}

export class SlackWebhook extends S.Class<SlackWebhook>("SlackWebhook")({
  "text": S.optionalWith(S.String.pipe(S.maxLength(2000)), { nullable: true }),
  "username": S.optionalWith(S.String.pipe(S.maxLength(152133)), { nullable: true }),
  "icon_url": S.optionalWith(S.String.pipe(S.maxLength(2048)), { nullable: true }),
  "attachments": S.optionalWith(S.Array(WebhookSlackEmbed).pipe(S.maxItems(1521)), { nullable: true })
}) {}

export class ExecuteSlackCompatibleWebhook200 extends S.String {}

export const make = (
  httpClient: HttpClient.HttpClient, 
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  } = {}
): Client => {
  const unexpectedStatus = (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.json, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request: response.request,
            response,
            reason: "StatusCode",
            description: typeof description === "string" ? description : JSON.stringify(description),
          }),
        ),
    )
  const withResponse: <A, E>(
    f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<A, E>,
  ) => (
    request: HttpClientRequest.HttpClientRequest,
  ) => Effect.Effect<any, any> = options.transformClient
    ? (f) => (request) =>
        Effect.flatMap(
          Effect.flatMap(options.transformClient!(httpClient), (client) =>
            client.execute(request),
          ),
          f,
        )
    : (f) => (request) => Effect.flatMap(httpClient.execute(request), f)
  const decodeSuccess =
    <A, I, R>(schema: S.Schema<A, I, R>) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      HttpClientResponse.schemaBodyJson(schema)(response)
  const decodeError =
    <const Tag extends string, A, I, R>(tag: Tag, schema: S.Schema<A, I, R>) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(schema)(response),
        (cause) => Effect.fail(ClientError(tag, cause, response)),
      )
  return {
    httpClient,
    "getMyApplication": () => HttpClientRequest.get(`/applications/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateApplicationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateMyApplication": (options) => HttpClientRequest.patch(`/applications/@me`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateApplicationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getApplication": (applicationId) => HttpClientRequest.get(`/applications/${applicationId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateApplicationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateApplication": (applicationId, options) => HttpClientRequest.patch(`/applications/${applicationId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateApplicationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "applicationsGetActivityInstance": (applicationId, instanceId) => HttpClientRequest.get(`/applications/${applicationId}/activity-instances/${instanceId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmbeddedActivityInstance),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "uploadApplicationAttachment": (applicationId, options) => HttpClientRequest.post(`/applications/${applicationId}/attachment`).pipe(
    HttpClientRequest.bodyFormDataRecord(options as any),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ActivitiesAttachmentResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listApplicationCommands": (applicationId, options) => HttpClientRequest.get(`/applications/${applicationId}/commands`).pipe(
    HttpClientRequest.setUrlParams({ "with_localizations": options?.["with_localizations"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListApplicationCommands200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkSetApplicationCommands": (applicationId, options) => HttpClientRequest.put(`/applications/${applicationId}/commands`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(BulkSetApplicationCommands200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createApplicationCommand": (applicationId, options) => HttpClientRequest.post(`/applications/${applicationId}/commands`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "200": decodeSuccess(ApplicationCommandResponse),
      "201": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getApplicationCommand": (applicationId, commandId) => HttpClientRequest.get(`/applications/${applicationId}/commands/${commandId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteApplicationCommand": (applicationId, commandId) => HttpClientRequest.del(`/applications/${applicationId}/commands/${commandId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateApplicationCommand": (applicationId, commandId, options) => HttpClientRequest.patch(`/applications/${applicationId}/commands/${commandId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listApplicationEmojis": (applicationId) => HttpClientRequest.get(`/applications/${applicationId}/emojis`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListApplicationEmojisResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createApplicationEmoji": (applicationId, options) => HttpClientRequest.post(`/applications/${applicationId}/emojis`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getApplicationEmoji": (applicationId, emojiId) => HttpClientRequest.get(`/applications/${applicationId}/emojis/${emojiId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteApplicationEmoji": (applicationId, emojiId) => HttpClientRequest.del(`/applications/${applicationId}/emojis/${emojiId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateApplicationEmoji": (applicationId, emojiId, options) => HttpClientRequest.patch(`/applications/${applicationId}/emojis/${emojiId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getEntitlements": (applicationId, options) => HttpClientRequest.get(`/applications/${applicationId}/entitlements`).pipe(
    HttpClientRequest.setUrlParams({ "user_id": options?.["user_id"] as any, "sku_ids": options?.["sku_ids"] as any, "guild_id": options?.["guild_id"] as any, "before": options?.["before"] as any, "after": options?.["after"] as any, "limit": options?.["limit"] as any, "exclude_ended": options?.["exclude_ended"] as any, "exclude_deleted": options?.["exclude_deleted"] as any, "only_active": options?.["only_active"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetEntitlements200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createEntitlement": (applicationId, options) => HttpClientRequest.post(`/applications/${applicationId}/entitlements`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EntitlementResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getEntitlement": (applicationId, entitlementId) => HttpClientRequest.get(`/applications/${applicationId}/entitlements/${entitlementId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EntitlementResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteEntitlement": (applicationId, entitlementId) => HttpClientRequest.del(`/applications/${applicationId}/entitlements/${entitlementId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "consumeEntitlement": (applicationId, entitlementId) => HttpClientRequest.post(`/applications/${applicationId}/entitlements/${entitlementId}/consume`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listGuildApplicationCommands": (applicationId, guildId, options) => HttpClientRequest.get(`/applications/${applicationId}/guilds/${guildId}/commands`).pipe(
    HttpClientRequest.setUrlParams({ "with_localizations": options?.["with_localizations"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildApplicationCommands200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkSetGuildApplicationCommands": (applicationId, guildId, options) => HttpClientRequest.put(`/applications/${applicationId}/guilds/${guildId}/commands`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(BulkSetGuildApplicationCommands200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildApplicationCommand": (applicationId, guildId, options) => HttpClientRequest.post(`/applications/${applicationId}/guilds/${guildId}/commands`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "200": decodeSuccess(ApplicationCommandResponse),
      "201": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildApplicationCommandPermissions": (applicationId, guildId) => HttpClientRequest.get(`/applications/${applicationId}/guilds/${guildId}/commands/permissions`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildApplicationCommandPermissions200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildApplicationCommand": (applicationId, guildId, commandId) => HttpClientRequest.get(`/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildApplicationCommand": (applicationId, guildId, commandId) => HttpClientRequest.del(`/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildApplicationCommand": (applicationId, guildId, commandId, options) => HttpClientRequest.patch(`/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationCommandResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildApplicationCommandPermissions": (applicationId, guildId, commandId) => HttpClientRequest.get(`/applications/${applicationId}/guilds/${guildId}/commands/${commandId}/permissions`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CommandPermissionsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "setGuildApplicationCommandPermissions": (applicationId, guildId, commandId, options) => HttpClientRequest.put(`/applications/${applicationId}/guilds/${guildId}/commands/${commandId}/permissions`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CommandPermissionsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getApplicationRoleConnectionsMetadata": (applicationId) => HttpClientRequest.get(`/applications/${applicationId}/role-connections/metadata`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetApplicationRoleConnectionsMetadata200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateApplicationRoleConnectionsMetadata": (applicationId, options) => HttpClientRequest.put(`/applications/${applicationId}/role-connections/metadata`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateApplicationRoleConnectionsMetadata200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getChannel": (channelId) => HttpClientRequest.get(`/channels/${channelId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetChannel200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteChannel": (channelId) => HttpClientRequest.del(`/channels/${channelId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(DeleteChannel200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateChannel": (channelId, options) => HttpClientRequest.patch(`/channels/${channelId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateChannel200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "followChannel": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/followers`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ChannelFollowerResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listChannelInvites": (channelId) => HttpClientRequest.get(`/channels/${channelId}/invites`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListChannelInvites200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createChannelInvite": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/invites`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CreateChannelInvite200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listMessages": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/messages`).pipe(
    HttpClientRequest.setUrlParams({ "around": options?.["around"] as any, "before": options?.["before"] as any, "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListMessages200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createMessage": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/messages`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkDeleteMessages": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/messages/bulk-delete`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listPins": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/messages/pins`).pipe(
    HttpClientRequest.setUrlParams({ "before": options?.["before"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PinnedMessagesResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createPin": (channelId, messageId) => HttpClientRequest.put(`/channels/${channelId}/messages/pins/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deletePin": (channelId, messageId) => HttpClientRequest.del(`/channels/${channelId}/messages/pins/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getMessage": (channelId, messageId) => HttpClientRequest.get(`/channels/${channelId}/messages/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteMessage": (channelId, messageId) => HttpClientRequest.del(`/channels/${channelId}/messages/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateMessage": (channelId, messageId, options) => HttpClientRequest.patch(`/channels/${channelId}/messages/${messageId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "crosspostMessage": (channelId, messageId) => HttpClientRequest.post(`/channels/${channelId}/messages/${messageId}/crosspost`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteAllMessageReactions": (channelId, messageId) => HttpClientRequest.del(`/channels/${channelId}/messages/${messageId}/reactions`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listMessageReactionsByEmoji": (channelId, messageId, emojiName, options) => HttpClientRequest.get(`/channels/${channelId}/messages/${messageId}/reactions/${emojiName}`).pipe(
    HttpClientRequest.setUrlParams({ "after": options?.["after"] as any, "limit": options?.["limit"] as any, "type": options?.["type"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListMessageReactionsByEmoji200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteAllMessageReactionsByEmoji": (channelId, messageId, emojiName) => HttpClientRequest.del(`/channels/${channelId}/messages/${messageId}/reactions/${emojiName}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "addMyMessageReaction": (channelId, messageId, emojiName) => HttpClientRequest.put(`/channels/${channelId}/messages/${messageId}/reactions/${emojiName}/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteMyMessageReaction": (channelId, messageId, emojiName) => HttpClientRequest.del(`/channels/${channelId}/messages/${messageId}/reactions/${emojiName}/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteUserMessageReaction": (channelId, messageId, emojiName, userId) => HttpClientRequest.del(`/channels/${channelId}/messages/${messageId}/reactions/${emojiName}/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "createThreadFromMessage": (channelId, messageId, options) => HttpClientRequest.post(`/channels/${channelId}/messages/${messageId}/threads`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "setChannelPermissionOverwrite": (channelId, overwriteId, options) => HttpClientRequest.put(`/channels/${channelId}/permissions/${overwriteId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteChannelPermissionOverwrite": (channelId, overwriteId) => HttpClientRequest.del(`/channels/${channelId}/permissions/${overwriteId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deprecatedListPins": (channelId) => HttpClientRequest.get(`/channels/${channelId}/pins`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(DeprecatedListPins200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deprecatedCreatePin": (channelId, messageId) => HttpClientRequest.put(`/channels/${channelId}/pins/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deprecatedDeletePin": (channelId, messageId) => HttpClientRequest.del(`/channels/${channelId}/pins/${messageId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getAnswerVoters": (channelId, messageId, answerId, options) => HttpClientRequest.get(`/channels/${channelId}/polls/${messageId}/answers/${answerId}`).pipe(
    HttpClientRequest.setUrlParams({ "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PollAnswerDetailsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "pollExpire": (channelId, messageId) => HttpClientRequest.post(`/channels/${channelId}/polls/${messageId}/expire`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "addGroupDmUser": (channelId, userId, options) => HttpClientRequest.put(`/channels/${channelId}/recipients/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(AddGroupDmUser201),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteGroupDmUser": (channelId, userId) => HttpClientRequest.del(`/channels/${channelId}/recipients/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "sendSoundboardSound": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/send-soundboard-sound`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listThreadMembers": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/thread-members`).pipe(
    HttpClientRequest.setUrlParams({ "with_member": options?.["with_member"] as any, "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListThreadMembers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "joinThread": (channelId) => HttpClientRequest.put(`/channels/${channelId}/thread-members/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "leaveThread": (channelId) => HttpClientRequest.del(`/channels/${channelId}/thread-members/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getThreadMember": (channelId, userId, options) => HttpClientRequest.get(`/channels/${channelId}/thread-members/${userId}`).pipe(
    HttpClientRequest.setUrlParams({ "with_member": options?.["with_member"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "addThreadMember": (channelId, userId) => HttpClientRequest.put(`/channels/${channelId}/thread-members/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteThreadMember": (channelId, userId) => HttpClientRequest.del(`/channels/${channelId}/thread-members/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "createThread": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/threads`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CreatedThreadResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listPrivateArchivedThreads": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/threads/archived/private`).pipe(
    HttpClientRequest.setUrlParams({ "before": options?.["before"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listPublicArchivedThreads": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/threads/archived/public`).pipe(
    HttpClientRequest.setUrlParams({ "before": options?.["before"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "threadSearch": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/threads/search`).pipe(
    HttpClientRequest.setUrlParams({ "name": options?.["name"] as any, "slop": options?.["slop"] as any, "min_id": options?.["min_id"] as any, "max_id": options?.["max_id"] as any, "tag": options?.["tag"] as any, "tag_setting": options?.["tag_setting"] as any, "archived": options?.["archived"] as any, "sort_by": options?.["sort_by"] as any, "sort_order": options?.["sort_order"] as any, "limit": options?.["limit"] as any, "offset": options?.["offset"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadSearchResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "triggerTypingIndicator": (channelId) => HttpClientRequest.post(`/channels/${channelId}/typing`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(TypingIndicatorResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listMyPrivateArchivedThreads": (channelId, options) => HttpClientRequest.get(`/channels/${channelId}/users/@me/threads/archived/private`).pipe(
    HttpClientRequest.setUrlParams({ "before": options?.["before"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listChannelWebhooks": (channelId) => HttpClientRequest.get(`/channels/${channelId}/webhooks`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListChannelWebhooks200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createWebhook": (channelId, options) => HttpClientRequest.post(`/channels/${channelId}/webhooks`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildIncomingWebhookResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGateway": () => HttpClientRequest.get(`/gateway`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GatewayResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getBotGateway": () => HttpClientRequest.get(`/gateway/bot`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GatewayBotResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildTemplate": (code) => HttpClientRequest.get(`/guilds/templates/${code}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildTemplateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuild": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}`).pipe(
    HttpClientRequest.setUrlParams({ "with_counts": options?.["with_counts"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildWithCountsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateGuild": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildAuditLogEntries": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/audit-logs`).pipe(
    HttpClientRequest.setUrlParams({ "user_id": options?.["user_id"] as any, "target_id": options?.["target_id"] as any, "action_type": options?.["action_type"] as any, "before": options?.["before"] as any, "after": options?.["after"] as any, "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildAuditLogResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listAutoModerationRules": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/auto-moderation/rules`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListAutoModerationRules200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createAutoModerationRule": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/auto-moderation/rules`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CreateAutoModerationRule200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getAutoModerationRule": (guildId, ruleId) => HttpClientRequest.get(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetAutoModerationRule200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteAutoModerationRule": (guildId, ruleId) => HttpClientRequest.del(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateAutoModerationRule": (guildId, ruleId, options) => HttpClientRequest.patch(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateAutoModerationRule200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildBans": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/bans`).pipe(
    HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "before": options?.["before"] as any, "after": options?.["after"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildBans200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildBan": (guildId, userId) => HttpClientRequest.get(`/guilds/${guildId}/bans/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildBanResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "banUserFromGuild": (guildId, userId, options) => HttpClientRequest.put(`/guilds/${guildId}/bans/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "unbanUserFromGuild": (guildId, userId, options) => HttpClientRequest.del(`/guilds/${guildId}/bans/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "bulkBanUsersFromGuild": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/bulk-ban`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(BulkBanUsersResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildChannels": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/channels`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildChannels200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildChannel": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/channels`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildChannelResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkUpdateGuildChannels": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/channels`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listGuildEmojis": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/emojis`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildEmojis200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildEmoji": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/emojis`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildEmoji": (guildId, emojiId) => HttpClientRequest.get(`/guilds/${guildId}/emojis/${emojiId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildEmoji": (guildId, emojiId) => HttpClientRequest.del(`/guilds/${guildId}/emojis/${emojiId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildEmoji": (guildId, emojiId, options) => HttpClientRequest.patch(`/guilds/${guildId}/emojis/${emojiId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(EmojiResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildIntegrations": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/integrations`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildIntegrations200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildIntegration": (guildId, integrationId) => HttpClientRequest.del(`/guilds/${guildId}/integrations/${integrationId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "listGuildInvites": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/invites`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildInvites200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildMembers": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/members`).pipe(
    HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "after": options?.["after"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildMembers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateMyGuildMember": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/members/@me`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateGuildMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "searchGuildMembers": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/members/search`).pipe(
    HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any, "query": options?.["query"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(SearchGuildMembers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildMember": (guildId, userId) => HttpClientRequest.get(`/guilds/${guildId}/members/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "addGuildMember": (guildId, userId, options) => HttpClientRequest.put(`/guilds/${guildId}/members/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildMember": (guildId, userId) => HttpClientRequest.del(`/guilds/${guildId}/members/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildMember": (guildId, userId, options) => HttpClientRequest.patch(`/guilds/${guildId}/members/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "addGuildMemberRole": (guildId, userId, roleId) => HttpClientRequest.put(`/guilds/${guildId}/members/${userId}/roles/${roleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildMemberRole": (guildId, userId, roleId) => HttpClientRequest.del(`/guilds/${guildId}/members/${userId}/roles/${roleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getGuildNewMemberWelcome": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/new-member-welcome`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildHomeSettingsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getGuildsOnboarding": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/onboarding`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UserGuildOnboardingResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "putGuildsOnboarding": (guildId, options) => HttpClientRequest.put(`/guilds/${guildId}/onboarding`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildOnboardingResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildPreview": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/preview`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildPreviewResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "previewPruneGuild": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/prune`).pipe(
    HttpClientRequest.setUrlParams({ "days": options?.["days"] as any, "include_roles": options?.["include_roles"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildPruneResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "pruneGuild": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/prune`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildPruneResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildVoiceRegions": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/regions`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildVoiceRegions200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildRoles": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/roles`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildRoles200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildRole": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/roles`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildRoleResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkUpdateGuildRoles": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/roles`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(BulkUpdateGuildRoles200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildRole": (guildId, roleId) => HttpClientRequest.get(`/guilds/${guildId}/roles/${roleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildRoleResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildRole": (guildId, roleId) => HttpClientRequest.del(`/guilds/${guildId}/roles/${roleId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildRole": (guildId, roleId, options) => HttpClientRequest.patch(`/guilds/${guildId}/roles/${roleId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildRoleResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildScheduledEvents": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/scheduled-events`).pipe(
    HttpClientRequest.setUrlParams({ "with_user_count": options?.["with_user_count"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildScheduledEvents200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildScheduledEvent": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/scheduled-events`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CreateGuildScheduledEvent200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildScheduledEvent": (guildId, guildScheduledEventId, options) => HttpClientRequest.get(`/guilds/${guildId}/scheduled-events/${guildScheduledEventId}`).pipe(
    HttpClientRequest.setUrlParams({ "with_user_count": options?.["with_user_count"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetGuildScheduledEvent200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildScheduledEvent": (guildId, guildScheduledEventId) => HttpClientRequest.del(`/guilds/${guildId}/scheduled-events/${guildScheduledEventId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildScheduledEvent": (guildId, guildScheduledEventId, options) => HttpClientRequest.patch(`/guilds/${guildId}/scheduled-events/${guildScheduledEventId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateGuildScheduledEvent200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildScheduledEventUsers": (guildId, guildScheduledEventId, options) => HttpClientRequest.get(`/guilds/${guildId}/scheduled-events/${guildScheduledEventId}/users`).pipe(
    HttpClientRequest.setUrlParams({ "with_member": options?.["with_member"] as any, "limit": options?.["limit"] as any, "before": options?.["before"] as any, "after": options?.["after"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildScheduledEventUsers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildSoundboardSounds": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/soundboard-sounds`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildSoundboardSoundsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildSoundboardSound": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/soundboard-sounds`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(SoundboardSoundResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildSoundboardSound": (guildId, soundId) => HttpClientRequest.get(`/guilds/${guildId}/soundboard-sounds/${soundId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(SoundboardSoundResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildSoundboardSound": (guildId, soundId) => HttpClientRequest.del(`/guilds/${guildId}/soundboard-sounds/${soundId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildSoundboardSound": (guildId, soundId, options) => HttpClientRequest.patch(`/guilds/${guildId}/soundboard-sounds/${soundId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(SoundboardSoundResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildStickers": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/stickers`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildStickers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildSticker": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/stickers`).pipe(
    HttpClientRequest.bodyFormDataRecord(options as any),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildStickerResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildSticker": (guildId, stickerId) => HttpClientRequest.get(`/guilds/${guildId}/stickers/${stickerId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildStickerResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildSticker": (guildId, stickerId) => HttpClientRequest.del(`/guilds/${guildId}/stickers/${stickerId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildSticker": (guildId, stickerId, options) => HttpClientRequest.patch(`/guilds/${guildId}/stickers/${stickerId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildStickerResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listGuildTemplates": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/templates`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListGuildTemplates200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createGuildTemplate": (guildId, options) => HttpClientRequest.post(`/guilds/${guildId}/templates`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildTemplateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "syncGuildTemplate": (guildId, code) => HttpClientRequest.put(`/guilds/${guildId}/templates/${code}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildTemplateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteGuildTemplate": (guildId, code) => HttpClientRequest.del(`/guilds/${guildId}/templates/${code}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildTemplateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildTemplate": (guildId, code, options) => HttpClientRequest.patch(`/guilds/${guildId}/templates/${code}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildTemplateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getActiveGuildThreads": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/threads/active`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ThreadsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildVanityUrl": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/vanity-url`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(VanityURLResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getSelfVoiceState": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/voice-states/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(VoiceStateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateSelfVoiceState": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/voice-states/@me`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getVoiceState": (guildId, userId) => HttpClientRequest.get(`/guilds/${guildId}/voice-states/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(VoiceStateResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateVoiceState": (guildId, userId, options) => HttpClientRequest.patch(`/guilds/${guildId}/voice-states/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getGuildWebhooks": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/webhooks`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetGuildWebhooks200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildWelcomeScreen": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/welcome-screen`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildWelcomeScreenResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildWelcomeScreen": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/welcome-screen`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GuildWelcomeScreenResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildWidgetSettings": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/widget`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(WidgetSettingsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateGuildWidgetSettings": (guildId, options) => HttpClientRequest.patch(`/guilds/${guildId}/widget`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(WidgetSettingsResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildWidget": (guildId) => HttpClientRequest.get(`/guilds/${guildId}/widget.json`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(WidgetResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getGuildWidgetPng": (guildId, options) => HttpClientRequest.get(`/guilds/${guildId}/widget.png`).pipe(
    HttpClientRequest.setUrlParams({ "style": options?.["style"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createInteractionResponse": (interactionId, interactionToken, options) => HttpClientRequest.post(`/interactions/${interactionId}/${interactionToken}/callback`).pipe(
    HttpClientRequest.setUrlParams({ "with_response": options.params?.["with_response"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(InteractionCallbackResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "inviteResolve": (code, options) => HttpClientRequest.get(`/invites/${code}`).pipe(
    HttpClientRequest.setUrlParams({ "with_counts": options?.["with_counts"] as any, "guild_scheduled_event_id": options?.["guild_scheduled_event_id"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(InviteResolve200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "inviteRevoke": (code) => HttpClientRequest.del(`/invites/${code}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(InviteRevoke200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createOrJoinLobby": (options) => HttpClientRequest.put(`/lobbies`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createLobby": (options) => HttpClientRequest.post(`/lobbies`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getLobby": (lobbyId) => HttpClientRequest.get(`/lobbies/${lobbyId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "editLobby": (lobbyId, options) => HttpClientRequest.patch(`/lobbies/${lobbyId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "editLobbyChannelLink": (lobbyId, options) => HttpClientRequest.patch(`/lobbies/${lobbyId}/channel-linking`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "leaveLobby": (lobbyId) => HttpClientRequest.del(`/lobbies/${lobbyId}/members/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "createLinkedLobbyGuildInviteForSelf": (lobbyId) => HttpClientRequest.post(`/lobbies/${lobbyId}/members/@me/invites`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyGuildInviteResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "bulkUpdateLobbyMembers": (lobbyId, options) => HttpClientRequest.post(`/lobbies/${lobbyId}/members/bulk`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(BulkUpdateLobbyMembers200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "addLobbyMember": (lobbyId, userId, options) => HttpClientRequest.put(`/lobbies/${lobbyId}/members/${userId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteLobbyMember": (lobbyId, userId) => HttpClientRequest.del(`/lobbies/${lobbyId}/members/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "createLinkedLobbyGuildInviteForUser": (lobbyId, userId) => HttpClientRequest.post(`/lobbies/${lobbyId}/members/${userId}/invites`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyGuildInviteResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getLobbyMessages": (lobbyId, options) => HttpClientRequest.get(`/lobbies/${lobbyId}/messages`).pipe(
    HttpClientRequest.setUrlParams({ "limit": options?.["limit"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetLobbyMessages200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createLobbyMessage": (lobbyId, options) => HttpClientRequest.post(`/lobbies/${lobbyId}/messages`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(LobbyMessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getMyOauth2Authorization": () => HttpClientRequest.get(`/oauth2/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(OAuth2GetAuthorizationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getMyOauth2Application": () => HttpClientRequest.get(`/oauth2/applications/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateApplicationResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getPublicKeys": () => HttpClientRequest.get(`/oauth2/keys`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(OAuth2GetKeys),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getOpenidConnectUserinfo": () => HttpClientRequest.get(`/oauth2/userinfo`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(OAuth2GetOpenIDConnectUserInfoResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "partnerSdkUnmergeProvisionalAccount": (options) => HttpClientRequest.post(`/partner-sdk/provisional-accounts/unmerge`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "botPartnerSdkUnmergeProvisionalAccount": (options) => HttpClientRequest.post(`/partner-sdk/provisional-accounts/unmerge/bot`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "partnerSdkToken": (options) => HttpClientRequest.post(`/partner-sdk/token`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ProvisionalTokenResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "botPartnerSdkToken": (options) => HttpClientRequest.post(`/partner-sdk/token/bot`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ProvisionalTokenResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getSoundboardDefaultSounds": () => HttpClientRequest.get(`/soundboard-default-sounds`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetSoundboardDefaultSounds200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "createStageInstance": (options) => HttpClientRequest.post(`/stage-instances`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(StageInstanceResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getStageInstance": (channelId) => HttpClientRequest.get(`/stage-instances/${channelId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(StageInstanceResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteStageInstance": (channelId) => HttpClientRequest.del(`/stage-instances/${channelId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateStageInstance": (channelId, options) => HttpClientRequest.patch(`/stage-instances/${channelId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(StageInstanceResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listStickerPacks": () => HttpClientRequest.get(`/sticker-packs`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(StickerPackCollectionResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getStickerPack": (packId) => HttpClientRequest.get(`/sticker-packs/${packId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(StickerPackResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getSticker": (stickerId) => HttpClientRequest.get(`/stickers/${stickerId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetSticker200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getMyUser": () => HttpClientRequest.get(`/users/@me`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UserPIIResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateMyUser": (options) => HttpClientRequest.patch(`/users/@me`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UserPIIResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getApplicationUserRoleConnection": (applicationId) => HttpClientRequest.get(`/users/@me/applications/${applicationId}/role-connection`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationUserRoleConnectionResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "updateApplicationUserRoleConnection": (applicationId, options) => HttpClientRequest.put(`/users/@me/applications/${applicationId}/role-connection`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ApplicationUserRoleConnectionResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteApplicationUserRoleConnection": (applicationId) => HttpClientRequest.del(`/users/@me/applications/${applicationId}/role-connection`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "createDm": (options) => HttpClientRequest.post(`/users/@me/channels`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(CreateDm200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listMyConnections": () => HttpClientRequest.get(`/users/@me/connections`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListMyConnections200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listMyGuilds": (options) => HttpClientRequest.get(`/users/@me/guilds`).pipe(
    HttpClientRequest.setUrlParams({ "before": options?.["before"] as any, "after": options?.["after"] as any, "limit": options?.["limit"] as any, "with_counts": options?.["with_counts"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListMyGuilds200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "leaveGuild": (guildId) => HttpClientRequest.del(`/users/@me/guilds/${guildId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getMyGuildMember": (guildId) => HttpClientRequest.get(`/users/@me/guilds/${guildId}/member`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(PrivateGuildMemberResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getUser": (userId) => HttpClientRequest.get(`/users/${userId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UserResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "listVoiceRegions": () => HttpClientRequest.get(`/voice/regions`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ListVoiceRegions200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getWebhook": (webhookId) => HttpClientRequest.get(`/webhooks/${webhookId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetWebhook200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteWebhook": (webhookId) => HttpClientRequest.del(`/webhooks/${webhookId}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateWebhook": (webhookId, options) => HttpClientRequest.patch(`/webhooks/${webhookId}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateWebhook200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getWebhookByToken": (webhookId, webhookToken) => HttpClientRequest.get(`/webhooks/${webhookId}/${webhookToken}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(GetWebhookByToken200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "executeWebhook": (webhookId, webhookToken, options) => HttpClientRequest.post(`/webhooks/${webhookId}/${webhookToken}`).pipe(
    HttpClientRequest.setUrlParams({ "wait": options.params?.["wait"] as any, "thread_id": options.params?.["thread_id"] as any, "with_components": options.params?.["with_components"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "deleteWebhookByToken": (webhookId, webhookToken) => HttpClientRequest.del(`/webhooks/${webhookId}/${webhookToken}`).pipe(
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateWebhookByToken": (webhookId, webhookToken, options) => HttpClientRequest.patch(`/webhooks/${webhookId}/${webhookToken}`).pipe(
    HttpClientRequest.bodyUnsafeJson(options),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(UpdateWebhookByToken200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "executeGithubCompatibleWebhook": (webhookId, webhookToken, options) => HttpClientRequest.post(`/webhooks/${webhookId}/${webhookToken}/github`).pipe(
    HttpClientRequest.setUrlParams({ "wait": options.params?.["wait"] as any, "thread_id": options.params?.["thread_id"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "getOriginalWebhookMessage": (webhookId, webhookToken, options) => HttpClientRequest.get(`/webhooks/${webhookId}/${webhookToken}/messages/@original`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options?.["thread_id"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteOriginalWebhookMessage": (webhookId, webhookToken, options) => HttpClientRequest.del(`/webhooks/${webhookId}/${webhookToken}/messages/@original`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options?.["thread_id"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateOriginalWebhookMessage": (webhookId, webhookToken, options) => HttpClientRequest.patch(`/webhooks/${webhookId}/${webhookToken}/messages/@original`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options.params?.["thread_id"] as any, "with_components": options.params?.["with_components"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "getWebhookMessage": (webhookId, webhookToken, messageId, options) => HttpClientRequest.get(`/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options?.["thread_id"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "deleteWebhookMessage": (webhookId, webhookToken, messageId, options) => HttpClientRequest.del(`/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options?.["thread_id"] as any }),
    withResponse(HttpClientResponse.matchStatus({
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      "204": () => Effect.void,
      orElse: unexpectedStatus
    }))
  ),
  "updateWebhookMessage": (webhookId, webhookToken, messageId, options) => HttpClientRequest.patch(`/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`).pipe(
    HttpClientRequest.setUrlParams({ "thread_id": options.params?.["thread_id"] as any, "with_components": options.params?.["with_components"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(MessageResponse),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  ),
  "executeSlackCompatibleWebhook": (webhookId, webhookToken, options) => HttpClientRequest.post(`/webhooks/${webhookId}/${webhookToken}/slack`).pipe(
    HttpClientRequest.setUrlParams({ "wait": options.params?.["wait"] as any, "thread_id": options.params?.["thread_id"] as any }),
    HttpClientRequest.bodyUnsafeJson(options.payload),
    withResponse(HttpClientResponse.matchStatus({
      "2xx": decodeSuccess(ExecuteSlackCompatibleWebhook200),
      "429": decodeError("RatelimitedResponse", RatelimitedResponse),
      "4xx": decodeError("ErrorResponse", ErrorResponse),
      orElse: unexpectedStatus
    }))
  )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  readonly "getMyApplication": () => Effect.Effect<typeof PrivateApplicationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateMyApplication": (options: typeof ApplicationFormPartial.Encoded) => Effect.Effect<typeof PrivateApplicationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getApplication": (applicationId: string) => Effect.Effect<typeof PrivateApplicationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateApplication": (applicationId: string, options: typeof ApplicationFormPartial.Encoded) => Effect.Effect<typeof PrivateApplicationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "applicationsGetActivityInstance": (applicationId: string, instanceId: string) => Effect.Effect<typeof EmbeddedActivityInstance.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "uploadApplicationAttachment": (applicationId: string, options: typeof UploadApplicationAttachmentRequest.Encoded) => Effect.Effect<typeof ActivitiesAttachmentResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listApplicationCommands": (applicationId: string, options?: typeof ListApplicationCommandsParams.Encoded | undefined) => Effect.Effect<typeof ListApplicationCommands200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkSetApplicationCommands": (applicationId: string, options: typeof BulkSetApplicationCommandsRequest.Encoded) => Effect.Effect<typeof BulkSetApplicationCommands200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createApplicationCommand": (applicationId: string, options: typeof ApplicationCommandCreateRequest.Encoded) => Effect.Effect<typeof ApplicationCommandResponse.Type | typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getApplicationCommand": (applicationId: string, commandId: string) => Effect.Effect<typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteApplicationCommand": (applicationId: string, commandId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateApplicationCommand": (applicationId: string, commandId: string, options: typeof ApplicationCommandPatchRequestPartial.Encoded) => Effect.Effect<typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listApplicationEmojis": (applicationId: string) => Effect.Effect<typeof ListApplicationEmojisResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createApplicationEmoji": (applicationId: string, options: typeof CreateApplicationEmojiRequest.Encoded) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getApplicationEmoji": (applicationId: string, emojiId: string) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteApplicationEmoji": (applicationId: string, emojiId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateApplicationEmoji": (applicationId: string, emojiId: string, options: typeof UpdateApplicationEmojiRequest.Encoded) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getEntitlements": (applicationId: string, options?: typeof GetEntitlementsParams.Encoded | undefined) => Effect.Effect<typeof GetEntitlements200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createEntitlement": (applicationId: string, options: typeof CreateEntitlementRequestData.Encoded) => Effect.Effect<typeof EntitlementResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getEntitlement": (applicationId: string, entitlementId: string) => Effect.Effect<typeof EntitlementResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteEntitlement": (applicationId: string, entitlementId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "consumeEntitlement": (applicationId: string, entitlementId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildApplicationCommands": (applicationId: string, guildId: string, options?: typeof ListGuildApplicationCommandsParams.Encoded | undefined) => Effect.Effect<typeof ListGuildApplicationCommands200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkSetGuildApplicationCommands": (applicationId: string, guildId: string, options: typeof BulkSetGuildApplicationCommandsRequest.Encoded) => Effect.Effect<typeof BulkSetGuildApplicationCommands200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildApplicationCommand": (applicationId: string, guildId: string, options: typeof ApplicationCommandCreateRequest.Encoded) => Effect.Effect<typeof ApplicationCommandResponse.Type | typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildApplicationCommandPermissions": (applicationId: string, guildId: string) => Effect.Effect<typeof ListGuildApplicationCommandPermissions200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildApplicationCommand": (applicationId: string, guildId: string, commandId: string) => Effect.Effect<typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildApplicationCommand": (applicationId: string, guildId: string, commandId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildApplicationCommand": (applicationId: string, guildId: string, commandId: string, options: typeof ApplicationCommandPatchRequestPartial.Encoded) => Effect.Effect<typeof ApplicationCommandResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildApplicationCommandPermissions": (applicationId: string, guildId: string, commandId: string) => Effect.Effect<typeof CommandPermissionsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "setGuildApplicationCommandPermissions": (applicationId: string, guildId: string, commandId: string, options: typeof SetGuildApplicationCommandPermissionsRequest.Encoded) => Effect.Effect<typeof CommandPermissionsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getApplicationRoleConnectionsMetadata": (applicationId: string) => Effect.Effect<typeof GetApplicationRoleConnectionsMetadata200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateApplicationRoleConnectionsMetadata": (applicationId: string, options: typeof UpdateApplicationRoleConnectionsMetadataRequest.Encoded) => Effect.Effect<typeof UpdateApplicationRoleConnectionsMetadata200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getChannel": (channelId: string) => Effect.Effect<typeof GetChannel200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteChannel": (channelId: string) => Effect.Effect<typeof DeleteChannel200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateChannel": (channelId: string, options: typeof UpdateChannelRequest.Encoded) => Effect.Effect<typeof UpdateChannel200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "followChannel": (channelId: string, options: typeof FollowChannelRequest.Encoded) => Effect.Effect<typeof ChannelFollowerResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listChannelInvites": (channelId: string) => Effect.Effect<typeof ListChannelInvites200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createChannelInvite": (channelId: string, options: typeof CreateChannelInviteRequest.Encoded) => Effect.Effect<typeof CreateChannelInvite200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listMessages": (channelId: string, options?: typeof ListMessagesParams.Encoded | undefined) => Effect.Effect<typeof ListMessages200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createMessage": (channelId: string, options: typeof MessageCreateRequest.Encoded) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkDeleteMessages": (channelId: string, options: typeof BulkDeleteMessagesRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listPins": (channelId: string, options?: typeof ListPinsParams.Encoded | undefined) => Effect.Effect<typeof PinnedMessagesResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createPin": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deletePin": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getMessage": (channelId: string, messageId: string) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteMessage": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateMessage": (channelId: string, messageId: string, options: typeof MessageEditRequestPartial.Encoded) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "crosspostMessage": (channelId: string, messageId: string) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteAllMessageReactions": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listMessageReactionsByEmoji": (channelId: string, messageId: string, emojiName: string, options?: typeof ListMessageReactionsByEmojiParams.Encoded | undefined) => Effect.Effect<typeof ListMessageReactionsByEmoji200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteAllMessageReactionsByEmoji": (channelId: string, messageId: string, emojiName: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addMyMessageReaction": (channelId: string, messageId: string, emojiName: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteMyMessageReaction": (channelId: string, messageId: string, emojiName: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteUserMessageReaction": (channelId: string, messageId: string, emojiName: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createThreadFromMessage": (channelId: string, messageId: string, options: typeof CreateTextThreadWithMessageRequest.Encoded) => Effect.Effect<typeof ThreadResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "setChannelPermissionOverwrite": (channelId: string, overwriteId: string, options: typeof SetChannelPermissionOverwriteRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteChannelPermissionOverwrite": (channelId: string, overwriteId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deprecatedListPins": (channelId: string) => Effect.Effect<typeof DeprecatedListPins200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deprecatedCreatePin": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deprecatedDeletePin": (channelId: string, messageId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getAnswerVoters": (channelId: string, messageId: string, answerId: string, options?: typeof GetAnswerVotersParams.Encoded | undefined) => Effect.Effect<typeof PollAnswerDetailsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "pollExpire": (channelId: string, messageId: string) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addGroupDmUser": (channelId: string, userId: string, options: typeof AddGroupDmUserRequest.Encoded) => Effect.Effect<typeof AddGroupDmUser201.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGroupDmUser": (channelId: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "sendSoundboardSound": (channelId: string, options: typeof SoundboardSoundSendRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listThreadMembers": (channelId: string, options?: typeof ListThreadMembersParams.Encoded | undefined) => Effect.Effect<typeof ListThreadMembers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "joinThread": (channelId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "leaveThread": (channelId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getThreadMember": (channelId: string, userId: string, options?: typeof GetThreadMemberParams.Encoded | undefined) => Effect.Effect<typeof ThreadMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addThreadMember": (channelId: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteThreadMember": (channelId: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createThread": (channelId: string, options: typeof CreateThreadRequest.Encoded) => Effect.Effect<typeof CreatedThreadResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listPrivateArchivedThreads": (channelId: string, options?: typeof ListPrivateArchivedThreadsParams.Encoded | undefined) => Effect.Effect<typeof ThreadsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listPublicArchivedThreads": (channelId: string, options?: typeof ListPublicArchivedThreadsParams.Encoded | undefined) => Effect.Effect<typeof ThreadsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "threadSearch": (channelId: string, options?: typeof ThreadSearchParams.Encoded | undefined) => Effect.Effect<typeof ThreadSearchResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "triggerTypingIndicator": (channelId: string) => Effect.Effect<typeof TypingIndicatorResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listMyPrivateArchivedThreads": (channelId: string, options?: typeof ListMyPrivateArchivedThreadsParams.Encoded | undefined) => Effect.Effect<typeof ThreadsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listChannelWebhooks": (channelId: string) => Effect.Effect<typeof ListChannelWebhooks200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createWebhook": (channelId: string, options: typeof CreateWebhookRequest.Encoded) => Effect.Effect<typeof GuildIncomingWebhookResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGateway": () => Effect.Effect<typeof GatewayResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getBotGateway": () => Effect.Effect<typeof GatewayBotResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildTemplate": (code: string) => Effect.Effect<typeof GuildTemplateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuild": (guildId: string, options?: typeof GetGuildParams.Encoded | undefined) => Effect.Effect<typeof GuildWithCountsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuild": (guildId: string, options: typeof GuildPatchRequestPartial.Encoded) => Effect.Effect<typeof GuildResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildAuditLogEntries": (guildId: string, options?: typeof ListGuildAuditLogEntriesParams.Encoded | undefined) => Effect.Effect<typeof GuildAuditLogResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listAutoModerationRules": (guildId: string) => Effect.Effect<typeof ListAutoModerationRules200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createAutoModerationRule": (guildId: string, options: typeof CreateAutoModerationRuleRequest.Encoded) => Effect.Effect<typeof CreateAutoModerationRule200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getAutoModerationRule": (guildId: string, ruleId: string) => Effect.Effect<typeof GetAutoModerationRule200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteAutoModerationRule": (guildId: string, ruleId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateAutoModerationRule": (guildId: string, ruleId: string, options: typeof UpdateAutoModerationRuleRequest.Encoded) => Effect.Effect<typeof UpdateAutoModerationRule200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildBans": (guildId: string, options?: typeof ListGuildBansParams.Encoded | undefined) => Effect.Effect<typeof ListGuildBans200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildBan": (guildId: string, userId: string) => Effect.Effect<typeof GuildBanResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "banUserFromGuild": (guildId: string, userId: string, options: typeof BanUserFromGuildRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "unbanUserFromGuild": (guildId: string, userId: string, options: typeof UnbanUserFromGuildRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkBanUsersFromGuild": (guildId: string, options: typeof BulkBanUsersRequest.Encoded) => Effect.Effect<typeof BulkBanUsersResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildChannels": (guildId: string) => Effect.Effect<typeof ListGuildChannels200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildChannel": (guildId: string, options: typeof CreateGuildChannelRequest.Encoded) => Effect.Effect<typeof GuildChannelResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkUpdateGuildChannels": (guildId: string, options: typeof BulkUpdateGuildChannelsRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildEmojis": (guildId: string) => Effect.Effect<typeof ListGuildEmojis200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildEmoji": (guildId: string, options: typeof CreateGuildEmojiRequest.Encoded) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildEmoji": (guildId: string, emojiId: string) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildEmoji": (guildId: string, emojiId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildEmoji": (guildId: string, emojiId: string, options: typeof UpdateGuildEmojiRequest.Encoded) => Effect.Effect<typeof EmojiResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildIntegrations": (guildId: string) => Effect.Effect<typeof ListGuildIntegrations200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildIntegration": (guildId: string, integrationId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildInvites": (guildId: string) => Effect.Effect<typeof ListGuildInvites200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildMembers": (guildId: string, options?: typeof ListGuildMembersParams.Encoded | undefined) => Effect.Effect<typeof ListGuildMembers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateMyGuildMember": (guildId: string, options: typeof UpdateMyGuildMemberRequest.Encoded) => Effect.Effect<typeof PrivateGuildMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "searchGuildMembers": (guildId: string, options: typeof SearchGuildMembersParams.Encoded) => Effect.Effect<typeof SearchGuildMembers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildMember": (guildId: string, userId: string) => Effect.Effect<typeof GuildMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addGuildMember": (guildId: string, userId: string, options: typeof BotAddGuildMemberRequest.Encoded) => Effect.Effect<typeof GuildMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildMember": (guildId: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildMember": (guildId: string, userId: string, options: typeof UpdateGuildMemberRequest.Encoded) => Effect.Effect<typeof GuildMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addGuildMemberRole": (guildId: string, userId: string, roleId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildMemberRole": (guildId: string, userId: string, roleId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildNewMemberWelcome": (guildId: string) => Effect.Effect<typeof GuildHomeSettingsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildsOnboarding": (guildId: string) => Effect.Effect<typeof UserGuildOnboardingResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "putGuildsOnboarding": (guildId: string, options: typeof UpdateGuildOnboardingRequest.Encoded) => Effect.Effect<typeof GuildOnboardingResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildPreview": (guildId: string) => Effect.Effect<typeof GuildPreviewResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "previewPruneGuild": (guildId: string, options?: typeof PreviewPruneGuildParams.Encoded | undefined) => Effect.Effect<typeof GuildPruneResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "pruneGuild": (guildId: string, options: typeof PruneGuildRequest.Encoded) => Effect.Effect<typeof GuildPruneResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildVoiceRegions": (guildId: string) => Effect.Effect<typeof ListGuildVoiceRegions200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildRoles": (guildId: string) => Effect.Effect<typeof ListGuildRoles200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildRole": (guildId: string, options: typeof CreateRoleRequest.Encoded) => Effect.Effect<typeof GuildRoleResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkUpdateGuildRoles": (guildId: string, options: typeof BulkUpdateGuildRolesRequest.Encoded) => Effect.Effect<typeof BulkUpdateGuildRoles200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildRole": (guildId: string, roleId: string) => Effect.Effect<typeof GuildRoleResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildRole": (guildId: string, roleId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildRole": (guildId: string, roleId: string, options: typeof UpdateRoleRequestPartial.Encoded) => Effect.Effect<typeof GuildRoleResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildScheduledEvents": (guildId: string, options?: typeof ListGuildScheduledEventsParams.Encoded | undefined) => Effect.Effect<typeof ListGuildScheduledEvents200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildScheduledEvent": (guildId: string, options: typeof CreateGuildScheduledEventRequest.Encoded) => Effect.Effect<typeof CreateGuildScheduledEvent200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildScheduledEvent": (guildId: string, guildScheduledEventId: string, options?: typeof GetGuildScheduledEventParams.Encoded | undefined) => Effect.Effect<typeof GetGuildScheduledEvent200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildScheduledEvent": (guildId: string, guildScheduledEventId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildScheduledEvent": (guildId: string, guildScheduledEventId: string, options: typeof UpdateGuildScheduledEventRequest.Encoded) => Effect.Effect<typeof UpdateGuildScheduledEvent200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildScheduledEventUsers": (guildId: string, guildScheduledEventId: string, options?: typeof ListGuildScheduledEventUsersParams.Encoded | undefined) => Effect.Effect<typeof ListGuildScheduledEventUsers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildSoundboardSounds": (guildId: string) => Effect.Effect<typeof ListGuildSoundboardSoundsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildSoundboardSound": (guildId: string, options: typeof SoundboardCreateRequest.Encoded) => Effect.Effect<typeof SoundboardSoundResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildSoundboardSound": (guildId: string, soundId: string) => Effect.Effect<typeof SoundboardSoundResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildSoundboardSound": (guildId: string, soundId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildSoundboardSound": (guildId: string, soundId: string, options: typeof SoundboardPatchRequestPartial.Encoded) => Effect.Effect<typeof SoundboardSoundResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildStickers": (guildId: string) => Effect.Effect<typeof ListGuildStickers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildSticker": (guildId: string, options: typeof CreateGuildStickerRequest.Encoded) => Effect.Effect<typeof GuildStickerResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildSticker": (guildId: string, stickerId: string) => Effect.Effect<typeof GuildStickerResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildSticker": (guildId: string, stickerId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildSticker": (guildId: string, stickerId: string, options: typeof UpdateGuildStickerRequest.Encoded) => Effect.Effect<typeof GuildStickerResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listGuildTemplates": (guildId: string) => Effect.Effect<typeof ListGuildTemplates200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createGuildTemplate": (guildId: string, options: typeof CreateGuildTemplateRequest.Encoded) => Effect.Effect<typeof GuildTemplateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "syncGuildTemplate": (guildId: string, code: string) => Effect.Effect<typeof GuildTemplateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteGuildTemplate": (guildId: string, code: string) => Effect.Effect<typeof GuildTemplateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildTemplate": (guildId: string, code: string, options: typeof UpdateGuildTemplateRequest.Encoded) => Effect.Effect<typeof GuildTemplateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getActiveGuildThreads": (guildId: string) => Effect.Effect<typeof ThreadsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildVanityUrl": (guildId: string) => Effect.Effect<typeof VanityURLResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getSelfVoiceState": (guildId: string) => Effect.Effect<typeof VoiceStateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateSelfVoiceState": (guildId: string, options: typeof UpdateSelfVoiceStateRequestPartial.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getVoiceState": (guildId: string, userId: string) => Effect.Effect<typeof VoiceStateResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateVoiceState": (guildId: string, userId: string, options: typeof UpdateVoiceStateRequestPartial.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildWebhooks": (guildId: string) => Effect.Effect<typeof GetGuildWebhooks200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildWelcomeScreen": (guildId: string) => Effect.Effect<typeof GuildWelcomeScreenResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildWelcomeScreen": (guildId: string, options: typeof WelcomeScreenPatchRequestPartial.Encoded) => Effect.Effect<typeof GuildWelcomeScreenResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildWidgetSettings": (guildId: string) => Effect.Effect<typeof WidgetSettingsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateGuildWidgetSettings": (guildId: string, options: typeof UpdateGuildWidgetSettingsRequest.Encoded) => Effect.Effect<typeof WidgetSettingsResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildWidget": (guildId: string) => Effect.Effect<typeof WidgetResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getGuildWidgetPng": (guildId: string, options?: typeof GetGuildWidgetPngParams.Encoded | undefined) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createInteractionResponse": (interactionId: string, interactionToken: string, options: { readonly params?: typeof CreateInteractionResponseParams.Encoded | undefined; readonly payload: typeof CreateInteractionResponseRequest.Encoded }) => Effect.Effect<typeof InteractionCallbackResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "inviteResolve": (code: string, options?: typeof InviteResolveParams.Encoded | undefined) => Effect.Effect<typeof InviteResolve200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "inviteRevoke": (code: string) => Effect.Effect<typeof InviteRevoke200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createOrJoinLobby": (options: typeof CreateOrJoinLobbyRequest.Encoded) => Effect.Effect<typeof LobbyResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createLobby": (options: typeof CreateLobbyRequest.Encoded) => Effect.Effect<typeof LobbyResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getLobby": (lobbyId: string) => Effect.Effect<typeof LobbyResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "editLobby": (lobbyId: string, options: typeof EditLobbyRequest.Encoded) => Effect.Effect<typeof LobbyResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "editLobbyChannelLink": (lobbyId: string, options: typeof EditLobbyChannelLinkRequest.Encoded) => Effect.Effect<typeof LobbyResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "leaveLobby": (lobbyId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createLinkedLobbyGuildInviteForSelf": (lobbyId: string) => Effect.Effect<typeof LobbyGuildInviteResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "bulkUpdateLobbyMembers": (lobbyId: string, options: typeof BulkUpdateLobbyMembersRequest.Encoded) => Effect.Effect<typeof BulkUpdateLobbyMembers200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "addLobbyMember": (lobbyId: string, userId: string, options: typeof AddLobbyMemberRequest.Encoded) => Effect.Effect<typeof LobbyMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteLobbyMember": (lobbyId: string, userId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createLinkedLobbyGuildInviteForUser": (lobbyId: string, userId: string) => Effect.Effect<typeof LobbyGuildInviteResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getLobbyMessages": (lobbyId: string, options?: typeof GetLobbyMessagesParams.Encoded | undefined) => Effect.Effect<typeof GetLobbyMessages200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createLobbyMessage": (lobbyId: string, options: typeof SDKMessageRequest.Encoded) => Effect.Effect<typeof LobbyMessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getMyOauth2Authorization": () => Effect.Effect<typeof OAuth2GetAuthorizationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getMyOauth2Application": () => Effect.Effect<typeof PrivateApplicationResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getPublicKeys": () => Effect.Effect<typeof OAuth2GetKeys.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getOpenidConnectUserinfo": () => Effect.Effect<typeof OAuth2GetOpenIDConnectUserInfoResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "partnerSdkUnmergeProvisionalAccount": (options: typeof PartnerSdkUnmergeProvisionalAccountRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "botPartnerSdkUnmergeProvisionalAccount": (options: typeof BotPartnerSdkUnmergeProvisionalAccountRequest.Encoded) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "partnerSdkToken": (options: typeof PartnerSdkTokenRequest.Encoded) => Effect.Effect<typeof ProvisionalTokenResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "botPartnerSdkToken": (options: typeof BotPartnerSdkTokenRequest.Encoded) => Effect.Effect<typeof ProvisionalTokenResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getSoundboardDefaultSounds": () => Effect.Effect<typeof GetSoundboardDefaultSounds200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createStageInstance": (options: typeof CreateStageInstanceRequest.Encoded) => Effect.Effect<typeof StageInstanceResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getStageInstance": (channelId: string) => Effect.Effect<typeof StageInstanceResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteStageInstance": (channelId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateStageInstance": (channelId: string, options: typeof UpdateStageInstanceRequest.Encoded) => Effect.Effect<typeof StageInstanceResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listStickerPacks": () => Effect.Effect<typeof StickerPackCollectionResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getStickerPack": (packId: string) => Effect.Effect<typeof StickerPackResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getSticker": (stickerId: string) => Effect.Effect<typeof GetSticker200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getMyUser": () => Effect.Effect<typeof UserPIIResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateMyUser": (options: typeof BotAccountPatchRequest.Encoded) => Effect.Effect<typeof UserPIIResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getApplicationUserRoleConnection": (applicationId: string) => Effect.Effect<typeof ApplicationUserRoleConnectionResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateApplicationUserRoleConnection": (applicationId: string, options: typeof UpdateApplicationUserRoleConnectionRequest.Encoded) => Effect.Effect<typeof ApplicationUserRoleConnectionResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteApplicationUserRoleConnection": (applicationId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "createDm": (options: typeof CreatePrivateChannelRequest.Encoded) => Effect.Effect<typeof CreateDm200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listMyConnections": () => Effect.Effect<typeof ListMyConnections200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listMyGuilds": (options?: typeof ListMyGuildsParams.Encoded | undefined) => Effect.Effect<typeof ListMyGuilds200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "leaveGuild": (guildId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getMyGuildMember": (guildId: string) => Effect.Effect<typeof PrivateGuildMemberResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getUser": (userId: string) => Effect.Effect<typeof UserResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "listVoiceRegions": () => Effect.Effect<typeof ListVoiceRegions200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getWebhook": (webhookId: string) => Effect.Effect<typeof GetWebhook200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteWebhook": (webhookId: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateWebhook": (webhookId: string, options: typeof UpdateWebhookRequest.Encoded) => Effect.Effect<typeof UpdateWebhook200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getWebhookByToken": (webhookId: string, webhookToken: string) => Effect.Effect<typeof GetWebhookByToken200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "executeWebhook": (webhookId: string, webhookToken: string, options: { readonly params?: typeof ExecuteWebhookParams.Encoded | undefined; readonly payload: typeof ExecuteWebhookRequest.Encoded }) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteWebhookByToken": (webhookId: string, webhookToken: string) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateWebhookByToken": (webhookId: string, webhookToken: string, options: typeof UpdateWebhookByTokenRequest.Encoded) => Effect.Effect<typeof UpdateWebhookByToken200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "executeGithubCompatibleWebhook": (webhookId: string, webhookToken: string, options: { readonly params?: typeof ExecuteGithubCompatibleWebhookParams.Encoded | undefined; readonly payload: typeof GithubWebhook.Encoded }) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getOriginalWebhookMessage": (webhookId: string, webhookToken: string, options?: typeof GetOriginalWebhookMessageParams.Encoded | undefined) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteOriginalWebhookMessage": (webhookId: string, webhookToken: string, options?: typeof DeleteOriginalWebhookMessageParams.Encoded | undefined) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateOriginalWebhookMessage": (webhookId: string, webhookToken: string, options: { readonly params?: typeof UpdateOriginalWebhookMessageParams.Encoded | undefined; readonly payload: typeof IncomingWebhookUpdateRequestPartial.Encoded }) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "getWebhookMessage": (webhookId: string, webhookToken: string, messageId: string, options?: typeof GetWebhookMessageParams.Encoded | undefined) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "deleteWebhookMessage": (webhookId: string, webhookToken: string, messageId: string, options?: typeof DeleteWebhookMessageParams.Encoded | undefined) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "updateWebhookMessage": (webhookId: string, webhookToken: string, messageId: string, options: { readonly params?: typeof UpdateWebhookMessageParams.Encoded | undefined; readonly payload: typeof IncomingWebhookUpdateRequestPartial.Encoded }) => Effect.Effect<typeof MessageResponse.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
  readonly "executeSlackCompatibleWebhook": (webhookId: string, webhookToken: string, options: { readonly params?: typeof ExecuteSlackCompatibleWebhookParams.Encoded | undefined; readonly payload: typeof SlackWebhook.Encoded }) => Effect.Effect<typeof ExecuteSlackCompatibleWebhook200.Type, HttpClientError.HttpClientError | ParseError | ClientError<"RatelimitedResponse", typeof RatelimitedResponse.Type> | ClientError<"ErrorResponse", typeof ErrorResponse.Type>>
}

export interface ClientError<Tag extends string, E> {
  readonly _tag: Tag
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: HttpClientResponse.HttpClientResponse
  readonly cause: E
}

class ClientErrorImpl extends Data.Error<{
  _tag: string
  cause: any
  request: HttpClientRequest.HttpClientRequest
  response: HttpClientResponse.HttpClientResponse
}> {}

export const ClientError = <Tag extends string, E>(
  tag: Tag,
  cause: E,
  response: HttpClientResponse.HttpClientResponse,
): ClientError<Tag, E> =>
  new ClientErrorImpl({
    _tag: tag,
    cause,
    response,
    request: response.request,
  }) as any
