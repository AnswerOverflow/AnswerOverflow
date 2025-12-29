import type * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { ParseError } from "effect/ParseResult";
import * as S from "effect/Schema";

export class AppsListInstallationsForAuthenticatedUserParams extends S.Struct({
	per_page: S.optionalWith(S.Int, {
		nullable: true,
		default: () => 30 as const,
	}),
	page: S.optionalWith(S.Int, { nullable: true, default: () => 1 as const }),
}) {}

/**
 * A GitHub user.
 */
export class SimpleUser extends S.Class<SimpleUser>("SimpleUser")({
	name: S.optionalWith(S.String, { nullable: true }),
	email: S.optionalWith(S.String, { nullable: true }),
	login: S.String,
	id: S.Int,
	node_id: S.String,
	avatar_url: S.String,
	gravatar_id: S.NullOr(S.String),
	url: S.String,
	html_url: S.String,
	followers_url: S.String,
	following_url: S.String,
	gists_url: S.String,
	starred_url: S.String,
	subscriptions_url: S.String,
	organizations_url: S.String,
	repos_url: S.String,
	events_url: S.String,
	received_events_url: S.String,
	type: S.String,
	site_admin: S.Boolean,
	starred_at: S.optionalWith(S.String, { nullable: true }),
	user_view_type: S.optionalWith(S.String, { nullable: true }),
}) {}

/**
 * An enterprise on GitHub.
 */
export class Enterprise extends S.Class<Enterprise>("Enterprise")({
	/**
	 * A short description of the enterprise.
	 */
	description: S.optionalWith(S.String, { nullable: true }),
	html_url: S.String,
	/**
	 * The enterprise's website URL.
	 */
	website_url: S.optionalWith(S.String, { nullable: true }),
	/**
	 * Unique identifier of the enterprise
	 */
	id: S.Int,
	node_id: S.String,
	/**
	 * The name of the enterprise.
	 */
	name: S.String,
	/**
	 * The slug url identifier for the enterprise.
	 */
	slug: S.String,
	created_at: S.NullOr(S.String),
	updated_at: S.NullOr(S.String),
	avatar_url: S.String,
}) {}

/**
 * Describe whether all repositories have been selected or there's a selection involved
 */
export class InstallationRepositorySelection extends S.Literal(
	"all",
	"selected",
) {}

/**
 * The level of permission to grant the access token for GitHub Actions workflows, workflow runs, and artifacts.
 */
export class AppPermissionsActions extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for repository creation, deletion, settings, teams, and collaborators creation.
 */
export class AppPermissionsAdministration extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to create and retrieve build artifact metadata records.
 */
export class AppPermissionsArtifactMetadata extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to create and retrieve the access token for repository attestations.
 */
export class AppPermissionsAttestations extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for checks on code.
 */
export class AppPermissionsChecks extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to create, edit, delete, and list Codespaces.
 */
export class AppPermissionsCodespaces extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for repository contents, commits, branches, downloads, releases, and merges.
 */
export class AppPermissionsContents extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage Dependabot secrets.
 */
export class AppPermissionsDependabotSecrets extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for deployments and deployment statuses.
 */
export class AppPermissionsDeployments extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for discussions and related comments and labels.
 */
export class AppPermissionsDiscussions extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for managing repository environments.
 */
export class AppPermissionsEnvironments extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for issues and related comments, assignees, labels, and milestones.
 */
export class AppPermissionsIssues extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage the merge queues for a repository.
 */
export class AppPermissionsMergeQueues extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to search repositories, list collaborators, and access repository metadata.
 */
export class AppPermissionsMetadata extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for packages published to GitHub Packages.
 */
export class AppPermissionsPackages extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to retrieve Pages statuses, configuration, and builds, as well as create new builds.
 */
export class AppPermissionsPages extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for pull requests and related comments, assignees, labels, milestones, and merges.
 */
export class AppPermissionsPullRequests extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to view and edit custom properties for a repository, when allowed by the property.
 */
export class AppPermissionsRepositoryCustomProperties extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to manage the post-receive hooks for a repository.
 */
export class AppPermissionsRepositoryHooks extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage repository projects, columns, and cards.
 */
export class AppPermissionsRepositoryProjects extends S.Literal(
	"read",
	"write",
	"admin",
) {}

/**
 * The level of permission to grant the access token to view and manage secret scanning alerts.
 */
export class AppPermissionsSecretScanningAlerts extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to manage repository secrets.
 */
export class AppPermissionsSecrets extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to view and manage security events like code scanning alerts.
 */
export class AppPermissionsSecurityEvents extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage just a single file.
 */
export class AppPermissionsSingleFile extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for commit statuses.
 */
export class AppPermissionsStatuses extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage Dependabot alerts.
 */
export class AppPermissionsVulnerabilityAlerts extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to update GitHub Actions workflow files.
 */
export class AppPermissionsWorkflows extends S.Literal("write") {}

/**
 * The level of permission to grant the access token to view and edit custom properties for an organization, when allowed by the property.
 */
export class AppPermissionsCustomPropertiesForOrganizations extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for organization teams and members.
 */
export class AppPermissionsMembers extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage access to an organization.
 */
export class AppPermissionsOrganizationAdministration extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for custom repository roles management.
 */
export class AppPermissionsOrganizationCustomRoles extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for custom organization roles management.
 */
export class AppPermissionsOrganizationCustomOrgRoles extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for repository custom properties management at the organization level.
 */
export class AppPermissionsOrganizationCustomProperties extends S.Literal(
	"read",
	"write",
	"admin",
) {}

/**
 * The level of permission to grant the access token for managing access to GitHub Copilot for members of an organization with a Copilot Business subscription. This property is in public preview and is subject to change.
 */
export class AppPermissionsOrganizationCopilotSeatManagement extends S.Literal(
	"write",
) {}

/**
 * The level of permission to grant the access token to view and manage announcement banners for an organization.
 */
export class AppPermissionsOrganizationAnnouncementBanners extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to view events triggered by an activity in an organization.
 */
export class AppPermissionsOrganizationEvents extends S.Literal("read") {}

/**
 * The level of permission to grant the access token to manage the post-receive hooks for an organization.
 */
export class AppPermissionsOrganizationHooks extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for viewing and managing fine-grained personal access token requests to an organization.
 */
export class AppPermissionsOrganizationPersonalAccessTokens extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for viewing and managing fine-grained personal access tokens that have been approved by an organization.
 */
export class AppPermissionsOrganizationPersonalAccessTokenRequests extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token for viewing an organization's plan.
 */
export class AppPermissionsOrganizationPlan extends S.Literal("read") {}

/**
 * The level of permission to grant the access token to manage organization projects and projects public preview (where available).
 */
export class AppPermissionsOrganizationProjects extends S.Literal(
	"read",
	"write",
	"admin",
) {}

/**
 * The level of permission to grant the access token for organization packages published to GitHub Packages.
 */
export class AppPermissionsOrganizationPackages extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to manage organization secrets.
 */
export class AppPermissionsOrganizationSecrets extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to view and manage GitHub Actions self-hosted runners available to an organization.
 */
export class AppPermissionsOrganizationSelfHostedRunners extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to view and manage users blocked by the organization.
 */
export class AppPermissionsOrganizationUserBlocking extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to manage team discussions and related comments.
 */
export class AppPermissionsTeamDiscussions extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage the email addresses belonging to a user.
 */
export class AppPermissionsEmailAddresses extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage the followers belonging to a user.
 */
export class AppPermissionsFollowers extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to manage git SSH keys.
 */
export class AppPermissionsGitSshKeys extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to view and manage GPG keys belonging to a user.
 */
export class AppPermissionsGpgKeys extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token to view and manage interaction limits on a repository.
 */
export class AppPermissionsInteractionLimits extends S.Literal(
	"read",
	"write",
) {}

/**
 * The level of permission to grant the access token to manage the profile settings belonging to a user.
 */
export class AppPermissionsProfile extends S.Literal("write") {}

/**
 * The level of permission to grant the access token to list and manage repositories a user is starring.
 */
export class AppPermissionsStarring extends S.Literal("read", "write") {}

/**
 * The level of permission to grant the access token for organization custom properties management at the enterprise level.
 */
export class AppPermissionsEnterpriseCustomPropertiesForOrganizations extends S.Literal(
	"read",
	"write",
	"admin",
) {}

/**
 * The permissions granted to the user access token.
 */
export class AppPermissions extends S.Class<AppPermissions>("AppPermissions")({
	/**
	 * The level of permission to grant the access token for GitHub Actions workflows, workflow runs, and artifacts.
	 */
	actions: S.optionalWith(AppPermissionsActions, { nullable: true }),
	/**
	 * The level of permission to grant the access token for repository creation, deletion, settings, teams, and collaborators creation.
	 */
	administration: S.optionalWith(AppPermissionsAdministration, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to create and retrieve build artifact metadata records.
	 */
	artifact_metadata: S.optionalWith(AppPermissionsArtifactMetadata, {
		nullable: true,
	}),
	/**
	 * The level of permission to create and retrieve the access token for repository attestations.
	 */
	attestations: S.optionalWith(AppPermissionsAttestations, { nullable: true }),
	/**
	 * The level of permission to grant the access token for checks on code.
	 */
	checks: S.optionalWith(AppPermissionsChecks, { nullable: true }),
	/**
	 * The level of permission to grant the access token to create, edit, delete, and list Codespaces.
	 */
	codespaces: S.optionalWith(AppPermissionsCodespaces, { nullable: true }),
	/**
	 * The level of permission to grant the access token for repository contents, commits, branches, downloads, releases, and merges.
	 */
	contents: S.optionalWith(AppPermissionsContents, { nullable: true }),
	/**
	 * The level of permission to grant the access token to manage Dependabot secrets.
	 */
	dependabot_secrets: S.optionalWith(AppPermissionsDependabotSecrets, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token for deployments and deployment statuses.
	 */
	deployments: S.optionalWith(AppPermissionsDeployments, { nullable: true }),
	/**
	 * The level of permission to grant the access token for discussions and related comments and labels.
	 */
	discussions: S.optionalWith(AppPermissionsDiscussions, { nullable: true }),
	/**
	 * The level of permission to grant the access token for managing repository environments.
	 */
	environments: S.optionalWith(AppPermissionsEnvironments, { nullable: true }),
	/**
	 * The level of permission to grant the access token for issues and related comments, assignees, labels, and milestones.
	 */
	issues: S.optionalWith(AppPermissionsIssues, { nullable: true }),
	/**
	 * The level of permission to grant the access token to manage the merge queues for a repository.
	 */
	merge_queues: S.optionalWith(AppPermissionsMergeQueues, { nullable: true }),
	/**
	 * The level of permission to grant the access token to search repositories, list collaborators, and access repository metadata.
	 */
	metadata: S.optionalWith(AppPermissionsMetadata, { nullable: true }),
	/**
	 * The level of permission to grant the access token for packages published to GitHub Packages.
	 */
	packages: S.optionalWith(AppPermissionsPackages, { nullable: true }),
	/**
	 * The level of permission to grant the access token to retrieve Pages statuses, configuration, and builds, as well as create new builds.
	 */
	pages: S.optionalWith(AppPermissionsPages, { nullable: true }),
	/**
	 * The level of permission to grant the access token for pull requests and related comments, assignees, labels, milestones, and merges.
	 */
	pull_requests: S.optionalWith(AppPermissionsPullRequests, { nullable: true }),
	/**
	 * The level of permission to grant the access token to view and edit custom properties for a repository, when allowed by the property.
	 */
	repository_custom_properties: S.optionalWith(
		AppPermissionsRepositoryCustomProperties,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token to manage the post-receive hooks for a repository.
	 */
	repository_hooks: S.optionalWith(AppPermissionsRepositoryHooks, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage repository projects, columns, and cards.
	 */
	repository_projects: S.optionalWith(AppPermissionsRepositoryProjects, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to view and manage secret scanning alerts.
	 */
	secret_scanning_alerts: S.optionalWith(AppPermissionsSecretScanningAlerts, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage repository secrets.
	 */
	secrets: S.optionalWith(AppPermissionsSecrets, { nullable: true }),
	/**
	 * The level of permission to grant the access token to view and manage security events like code scanning alerts.
	 */
	security_events: S.optionalWith(AppPermissionsSecurityEvents, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage just a single file.
	 */
	single_file: S.optionalWith(AppPermissionsSingleFile, { nullable: true }),
	/**
	 * The level of permission to grant the access token for commit statuses.
	 */
	statuses: S.optionalWith(AppPermissionsStatuses, { nullable: true }),
	/**
	 * The level of permission to grant the access token to manage Dependabot alerts.
	 */
	vulnerability_alerts: S.optionalWith(AppPermissionsVulnerabilityAlerts, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to update GitHub Actions workflow files.
	 */
	workflows: S.optionalWith(AppPermissionsWorkflows, { nullable: true }),
	/**
	 * The level of permission to grant the access token to view and edit custom properties for an organization, when allowed by the property.
	 */
	custom_properties_for_organizations: S.optionalWith(
		AppPermissionsCustomPropertiesForOrganizations,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for organization teams and members.
	 */
	members: S.optionalWith(AppPermissionsMembers, { nullable: true }),
	/**
	 * The level of permission to grant the access token to manage access to an organization.
	 */
	organization_administration: S.optionalWith(
		AppPermissionsOrganizationAdministration,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for custom repository roles management.
	 */
	organization_custom_roles: S.optionalWith(
		AppPermissionsOrganizationCustomRoles,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for custom organization roles management.
	 */
	organization_custom_org_roles: S.optionalWith(
		AppPermissionsOrganizationCustomOrgRoles,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for repository custom properties management at the organization level.
	 */
	organization_custom_properties: S.optionalWith(
		AppPermissionsOrganizationCustomProperties,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for managing access to GitHub Copilot for members of an organization with a Copilot Business subscription. This property is in public preview and is subject to change.
	 */
	organization_copilot_seat_management: S.optionalWith(
		AppPermissionsOrganizationCopilotSeatManagement,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token to view and manage announcement banners for an organization.
	 */
	organization_announcement_banners: S.optionalWith(
		AppPermissionsOrganizationAnnouncementBanners,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token to view events triggered by an activity in an organization.
	 */
	organization_events: S.optionalWith(AppPermissionsOrganizationEvents, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage the post-receive hooks for an organization.
	 */
	organization_hooks: S.optionalWith(AppPermissionsOrganizationHooks, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token for viewing and managing fine-grained personal access token requests to an organization.
	 */
	organization_personal_access_tokens: S.optionalWith(
		AppPermissionsOrganizationPersonalAccessTokens,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for viewing and managing fine-grained personal access tokens that have been approved by an organization.
	 */
	organization_personal_access_token_requests: S.optionalWith(
		AppPermissionsOrganizationPersonalAccessTokenRequests,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token for viewing an organization's plan.
	 */
	organization_plan: S.optionalWith(AppPermissionsOrganizationPlan, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage organization projects and projects public preview (where available).
	 */
	organization_projects: S.optionalWith(AppPermissionsOrganizationProjects, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token for organization packages published to GitHub Packages.
	 */
	organization_packages: S.optionalWith(AppPermissionsOrganizationPackages, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage organization secrets.
	 */
	organization_secrets: S.optionalWith(AppPermissionsOrganizationSecrets, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to view and manage GitHub Actions self-hosted runners available to an organization.
	 */
	organization_self_hosted_runners: S.optionalWith(
		AppPermissionsOrganizationSelfHostedRunners,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token to view and manage users blocked by the organization.
	 */
	organization_user_blocking: S.optionalWith(
		AppPermissionsOrganizationUserBlocking,
		{ nullable: true },
	),
	/**
	 * The level of permission to grant the access token to manage team discussions and related comments.
	 */
	team_discussions: S.optionalWith(AppPermissionsTeamDiscussions, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage the email addresses belonging to a user.
	 */
	email_addresses: S.optionalWith(AppPermissionsEmailAddresses, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage the followers belonging to a user.
	 */
	followers: S.optionalWith(AppPermissionsFollowers, { nullable: true }),
	/**
	 * The level of permission to grant the access token to manage git SSH keys.
	 */
	git_ssh_keys: S.optionalWith(AppPermissionsGitSshKeys, { nullable: true }),
	/**
	 * The level of permission to grant the access token to view and manage GPG keys belonging to a user.
	 */
	gpg_keys: S.optionalWith(AppPermissionsGpgKeys, { nullable: true }),
	/**
	 * The level of permission to grant the access token to view and manage interaction limits on a repository.
	 */
	interaction_limits: S.optionalWith(AppPermissionsInteractionLimits, {
		nullable: true,
	}),
	/**
	 * The level of permission to grant the access token to manage the profile settings belonging to a user.
	 */
	profile: S.optionalWith(AppPermissionsProfile, { nullable: true }),
	/**
	 * The level of permission to grant the access token to list and manage repositories a user is starring.
	 */
	starring: S.optionalWith(AppPermissionsStarring, { nullable: true }),
	/**
	 * The level of permission to grant the access token for organization custom properties management at the enterprise level.
	 */
	enterprise_custom_properties_for_organizations: S.optionalWith(
		AppPermissionsEnterpriseCustomPropertiesForOrganizations,
		{ nullable: true },
	),
}) {}

/**
 * A GitHub user.
 */
export class NullableSimpleUser extends S.Class<NullableSimpleUser>(
	"NullableSimpleUser",
)({
	name: S.optionalWith(S.String, { nullable: true }),
	email: S.optionalWith(S.String, { nullable: true }),
	login: S.String,
	id: S.Int,
	node_id: S.String,
	avatar_url: S.String,
	gravatar_id: S.NullOr(S.String),
	url: S.String,
	html_url: S.String,
	followers_url: S.String,
	following_url: S.String,
	gists_url: S.String,
	starred_url: S.String,
	subscriptions_url: S.String,
	organizations_url: S.String,
	repos_url: S.String,
	events_url: S.String,
	received_events_url: S.String,
	type: S.String,
	site_admin: S.Boolean,
	starred_at: S.optionalWith(S.String, { nullable: true }),
	user_view_type: S.optionalWith(S.String, { nullable: true }),
}) {}

/**
 * Installation
 */
export class Installation extends S.Class<Installation>("Installation")({
	/**
	 * The ID of the installation.
	 */
	id: S.Int,
	account: S.NullOr(S.Union(SimpleUser, Enterprise)),
	/**
	 * Describe whether all repositories have been selected or there's a selection involved
	 */
	repository_selection: InstallationRepositorySelection,
	access_tokens_url: S.String,
	repositories_url: S.String,
	html_url: S.String,
	app_id: S.Int,
	client_id: S.optionalWith(S.String, { nullable: true }),
	/**
	 * The ID of the user or organization this token is being scoped to.
	 */
	target_id: S.Int,
	target_type: S.String,
	permissions: AppPermissions,
	events: S.Array(S.String),
	created_at: S.String,
	updated_at: S.String,
	single_file_name: S.NullOr(S.String),
	has_multiple_single_files: S.optionalWith(S.Boolean, { nullable: true }),
	single_file_paths: S.optionalWith(S.Array(S.String), { nullable: true }),
	app_slug: S.String,
	suspended_by: S.NullOr(NullableSimpleUser),
	suspended_at: S.NullOr(S.String),
	contact_email: S.optionalWith(S.String, { nullable: true }),
}) {}

export class AppsListInstallationsForAuthenticatedUser200 extends S.Struct({
	total_count: S.Int,
	installations: S.Array(Installation),
}) {}

/**
 * Basic Error
 */
export class BasicError extends S.Class<BasicError>("BasicError")({
	message: S.optionalWith(S.String, { nullable: true }),
	documentation_url: S.optionalWith(S.String, { nullable: true }),
	url: S.optionalWith(S.String, { nullable: true }),
	status: S.optionalWith(S.String, { nullable: true }),
}) {}

export class AppsListInstallationReposForAuthenticatedUserParams extends S.Struct(
	{
		per_page: S.optionalWith(S.Int, {
			nullable: true,
			default: () => 30 as const,
		}),
		page: S.optionalWith(S.Int, { nullable: true, default: () => 1 as const }),
	},
) {}

/**
 * License Simple
 */
export class NullableLicenseSimple extends S.Class<NullableLicenseSimple>(
	"NullableLicenseSimple",
)({
	key: S.String,
	name: S.String,
	url: S.NullOr(S.String),
	spdx_id: S.NullOr(S.String),
	node_id: S.String,
	html_url: S.optionalWith(S.String, { nullable: true }),
}) {}

/**
 * The default value for a squash merge commit title:
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
 */
export class RepositorySquashMergeCommitTitle extends S.Literal(
	"PR_TITLE",
	"COMMIT_OR_PR_TITLE",
) {}

/**
 * The default value for a squash merge commit message:
 *
 * - `PR_BODY` - default to the pull request's body.
 * - `COMMIT_MESSAGES` - default to the branch's commit messages.
 * - `BLANK` - default to a blank commit message.
 */
export class RepositorySquashMergeCommitMessage extends S.Literal(
	"PR_BODY",
	"COMMIT_MESSAGES",
	"BLANK",
) {}

/**
 * The default value for a merge commit title.
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
 */
export class RepositoryMergeCommitTitle extends S.Literal(
	"PR_TITLE",
	"MERGE_MESSAGE",
) {}

/**
 * The default value for a merge commit message.
 *
 * - `PR_TITLE` - default to the pull request's title.
 * - `PR_BODY` - default to the pull request's body.
 * - `BLANK` - default to a blank commit message.
 */
export class RepositoryMergeCommitMessage extends S.Literal(
	"PR_BODY",
	"PR_TITLE",
	"BLANK",
) {}

/**
 * A repository on GitHub.
 */
export class Repository extends S.Class<Repository>("Repository")({
	/**
	 * Unique identifier of the repository
	 */
	id: S.Int,
	node_id: S.String,
	/**
	 * The name of the repository.
	 */
	name: S.String,
	full_name: S.String,
	license: S.NullOr(NullableLicenseSimple),
	forks: S.Int,
	permissions: S.optionalWith(
		S.Struct({
			admin: S.Boolean,
			pull: S.Boolean,
			triage: S.optionalWith(S.Boolean, { nullable: true }),
			push: S.Boolean,
			maintain: S.optionalWith(S.Boolean, { nullable: true }),
		}),
		{ nullable: true },
	),
	owner: SimpleUser,
	/**
	 * Whether the repository is private or public.
	 */
	private: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => false as const),
	),
	html_url: S.String,
	description: S.NullOr(S.String),
	fork: S.Boolean,
	url: S.String,
	archive_url: S.String,
	assignees_url: S.String,
	blobs_url: S.String,
	branches_url: S.String,
	collaborators_url: S.String,
	comments_url: S.String,
	commits_url: S.String,
	compare_url: S.String,
	contents_url: S.String,
	contributors_url: S.String,
	deployments_url: S.String,
	downloads_url: S.String,
	events_url: S.String,
	forks_url: S.String,
	git_commits_url: S.String,
	git_refs_url: S.String,
	git_tags_url: S.String,
	git_url: S.String,
	issue_comment_url: S.String,
	issue_events_url: S.String,
	issues_url: S.String,
	keys_url: S.String,
	labels_url: S.String,
	languages_url: S.String,
	merges_url: S.String,
	milestones_url: S.String,
	notifications_url: S.String,
	pulls_url: S.String,
	releases_url: S.String,
	ssh_url: S.String,
	stargazers_url: S.String,
	statuses_url: S.String,
	subscribers_url: S.String,
	subscription_url: S.String,
	tags_url: S.String,
	teams_url: S.String,
	trees_url: S.String,
	clone_url: S.String,
	mirror_url: S.NullOr(S.String),
	hooks_url: S.String,
	svn_url: S.String,
	homepage: S.NullOr(S.String),
	language: S.NullOr(S.String),
	forks_count: S.Int,
	stargazers_count: S.Int,
	watchers_count: S.Int,
	/**
	 * The size of the repository, in kilobytes. Size is calculated hourly. When a repository is initially created, the size is 0.
	 */
	size: S.Int,
	/**
	 * The default branch of the repository.
	 */
	default_branch: S.String,
	open_issues_count: S.Int,
	/**
	 * Whether this repository acts as a template that can be used to generate new repositories.
	 */
	is_template: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	topics: S.optionalWith(S.Array(S.String), { nullable: true }),
	/**
	 * Whether issues are enabled.
	 */
	has_issues: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => true as const),
	),
	/**
	 * Whether projects are enabled.
	 */
	has_projects: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => true as const),
	),
	/**
	 * Whether the wiki is enabled.
	 */
	has_wiki: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => true as const),
	),
	has_pages: S.Boolean,
	/**
	 * Whether downloads are enabled.
	 */
	has_downloads: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => true as const),
	),
	/**
	 * Whether discussions are enabled.
	 */
	has_discussions: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	/**
	 * Whether the repository is archived.
	 */
	archived: S.Boolean.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => false as const),
	),
	/**
	 * Returns whether or not this repository disabled.
	 */
	disabled: S.Boolean,
	/**
	 * The repository visibility: public, private, or internal.
	 */
	visibility: S.optionalWith(S.String, {
		nullable: true,
		default: () => "public" as const,
	}),
	pushed_at: S.NullOr(S.String),
	created_at: S.NullOr(S.String),
	updated_at: S.NullOr(S.String),
	/**
	 * Whether to allow rebase merges for pull requests.
	 */
	allow_rebase_merge: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => true as const,
	}),
	temp_clone_token: S.optionalWith(S.String, { nullable: true }),
	/**
	 * Whether to allow squash merges for pull requests.
	 */
	allow_squash_merge: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => true as const,
	}),
	/**
	 * Whether to allow Auto-merge to be used on pull requests.
	 */
	allow_auto_merge: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	/**
	 * Whether to delete head branches when pull requests are merged
	 */
	delete_branch_on_merge: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	/**
	 * Whether or not a pull request head branch that is behind its base branch can always be updated even if it is not required to be up to date before merging.
	 */
	allow_update_branch: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	/**
	 * Whether a squash merge commit can use the pull request title as default. **This property is closing down. Please use `squash_merge_commit_title` instead.
	 */
	use_squash_pr_title_as_default: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	/**
	 * The default value for a squash merge commit title:
	 *
	 * - `PR_TITLE` - default to the pull request's title.
	 * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
	 */
	squash_merge_commit_title: S.optionalWith(RepositorySquashMergeCommitTitle, {
		nullable: true,
	}),
	/**
	 * The default value for a squash merge commit message:
	 *
	 * - `PR_BODY` - default to the pull request's body.
	 * - `COMMIT_MESSAGES` - default to the branch's commit messages.
	 * - `BLANK` - default to a blank commit message.
	 */
	squash_merge_commit_message: S.optionalWith(
		RepositorySquashMergeCommitMessage,
		{ nullable: true },
	),
	/**
	 * The default value for a merge commit title.
	 *
	 * - `PR_TITLE` - default to the pull request's title.
	 * - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
	 */
	merge_commit_title: S.optionalWith(RepositoryMergeCommitTitle, {
		nullable: true,
	}),
	/**
	 * The default value for a merge commit message.
	 *
	 * - `PR_TITLE` - default to the pull request's title.
	 * - `PR_BODY` - default to the pull request's body.
	 * - `BLANK` - default to a blank commit message.
	 */
	merge_commit_message: S.optionalWith(RepositoryMergeCommitMessage, {
		nullable: true,
	}),
	/**
	 * Whether to allow merge commits for pull requests.
	 */
	allow_merge_commit: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => true as const,
	}),
	/**
	 * Whether to allow forking this repo
	 */
	allow_forking: S.optionalWith(S.Boolean, { nullable: true }),
	/**
	 * Whether to require contributors to sign off on web-based commits
	 */
	web_commit_signoff_required: S.optionalWith(S.Boolean, {
		nullable: true,
		default: () => false as const,
	}),
	open_issues: S.Int,
	watchers: S.Int,
	master_branch: S.optionalWith(S.String, { nullable: true }),
	starred_at: S.optionalWith(S.String, { nullable: true }),
	/**
	 * Whether anonymous git access is enabled for this repository
	 */
	anonymous_access_enabled: S.optionalWith(S.Boolean, { nullable: true }),
	/**
	 * The status of the code search index for this repository
	 */
	code_search_index_status: S.optionalWith(
		S.Struct({
			lexical_search_ok: S.optionalWith(S.Boolean, { nullable: true }),
			lexical_commit_sha: S.optionalWith(S.String, { nullable: true }),
		}),
		{ nullable: true },
	),
}) {}

export class AppsListInstallationReposForAuthenticatedUser200 extends S.Struct({
	total_count: S.Int,
	repository_selection: S.optionalWith(S.String, { nullable: true }),
	repositories: S.Array(Repository),
}) {}

export class IssuesListForRepoParamsState extends S.Literal(
	"open",
	"closed",
	"all",
) {}

export class IssuesListForRepoParamsSort extends S.Literal(
	"created",
	"updated",
	"comments",
) {}

export class IssuesListForRepoParamsDirection extends S.Literal(
	"asc",
	"desc",
) {}

export class IssuesListForRepoParams extends S.Struct({
	milestone: S.optionalWith(S.String, { nullable: true }),
	state: S.optionalWith(IssuesListForRepoParamsState, {
		nullable: true,
		default: () => "open" as const,
	}),
	assignee: S.optionalWith(S.String, { nullable: true }),
	type: S.optionalWith(S.String, { nullable: true }),
	creator: S.optionalWith(S.String, { nullable: true }),
	mentioned: S.optionalWith(S.String, { nullable: true }),
	labels: S.optionalWith(S.String, { nullable: true }),
	sort: S.optionalWith(IssuesListForRepoParamsSort, {
		nullable: true,
		default: () => "created" as const,
	}),
	direction: S.optionalWith(IssuesListForRepoParamsDirection, {
		nullable: true,
		default: () => "desc" as const,
	}),
	since: S.optionalWith(S.String, { nullable: true }),
	per_page: S.optionalWith(S.Int, {
		nullable: true,
		default: () => 30 as const,
	}),
	page: S.optionalWith(S.Int, { nullable: true, default: () => 1 as const }),
}) {}

/**
 * The reason for the current state
 */
export class IssueStateReason extends S.Literal(
	"completed",
	"reopened",
	"not_planned",
	"duplicate",
) {}

/**
 * The state of the milestone.
 */
export class NullableMilestoneState extends S.Literal("open", "closed") {}

/**
 * A collection of related issues and pull requests.
 */
export class NullableMilestone extends S.Class<NullableMilestone>(
	"NullableMilestone",
)({
	url: S.String,
	html_url: S.String,
	labels_url: S.String,
	id: S.Int,
	node_id: S.String,
	/**
	 * The number of the milestone.
	 */
	number: S.Int,
	/**
	 * The state of the milestone.
	 */
	state: NullableMilestoneState.pipe(
		S.propertySignature,
		S.withConstructorDefault(() => "open" as const),
	),
	/**
	 * The title of the milestone.
	 */
	title: S.String,
	description: S.NullOr(S.String),
	creator: S.NullOr(NullableSimpleUser),
	open_issues: S.Int,
	closed_issues: S.Int,
	created_at: S.String,
	updated_at: S.String,
	closed_at: S.NullOr(S.String),
	due_on: S.NullOr(S.String),
}) {}

/**
 * The color of the issue type.
 */
export class IssueTypeColor extends S.Literal(
	"gray",
	"blue",
	"green",
	"yellow",
	"orange",
	"red",
	"pink",
	"purple",
) {}

/**
 * The type of issue.
 */
export class IssueType extends S.Class<IssueType>("IssueType")({
	/**
	 * The unique identifier of the issue type.
	 */
	id: S.Int,
	/**
	 * The node identifier of the issue type.
	 */
	node_id: S.String,
	/**
	 * The name of the issue type.
	 */
	name: S.String,
	/**
	 * The description of the issue type.
	 */
	description: S.NullOr(S.String),
	/**
	 * The color of the issue type.
	 */
	color: S.optionalWith(IssueTypeColor, { nullable: true }),
	/**
	 * The time the issue type created.
	 */
	created_at: S.optionalWith(S.String, { nullable: true }),
	/**
	 * The time the issue type last updated.
	 */
	updated_at: S.optionalWith(S.String, { nullable: true }),
	/**
	 * The enabled state of the issue type.
	 */
	is_enabled: S.optionalWith(S.Boolean, { nullable: true }),
}) {}

/**
 * GitHub apps are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. GitHub apps are first class actors within GitHub.
 */
export class NullableIntegration extends S.Class<NullableIntegration>(
	"NullableIntegration",
)({
	/**
	 * Unique identifier of the GitHub app
	 */
	id: S.Int,
	/**
	 * The slug name of the GitHub app
	 */
	slug: S.optionalWith(S.String, { nullable: true }),
	node_id: S.String,
	client_id: S.optionalWith(S.String, { nullable: true }),
	owner: S.Union(SimpleUser, Enterprise),
	/**
	 * The name of the GitHub app
	 */
	name: S.String,
	description: S.NullOr(S.String),
	external_url: S.String,
	html_url: S.String,
	created_at: S.String,
	updated_at: S.String,
	/**
	 * The set of permissions for the GitHub app
	 */
	permissions: S.Struct({
		issues: S.optionalWith(S.String, { nullable: true }),
		checks: S.optionalWith(S.String, { nullable: true }),
		metadata: S.optionalWith(S.String, { nullable: true }),
		contents: S.optionalWith(S.String, { nullable: true }),
		deployments: S.optionalWith(S.String, { nullable: true }),
	}),
	/**
	 * The list of events for the GitHub app. Note that the `installation_target`, `security_advisory`, and `meta` events are not included because they are global events and not specific to an installation.
	 */
	events: S.Array(S.String),
	/**
	 * The number of installations associated with the GitHub app. Only returned when the integration is requesting details about itself.
	 */
	installations_count: S.optionalWith(S.Int, { nullable: true }),
}) {}

/**
 * How the author is associated with the repository.
 */
export class AuthorAssociation extends S.Literal(
	"COLLABORATOR",
	"CONTRIBUTOR",
	"FIRST_TIMER",
	"FIRST_TIME_CONTRIBUTOR",
	"MANNEQUIN",
	"MEMBER",
	"NONE",
	"OWNER",
) {}

export class ReactionRollup extends S.Class<ReactionRollup>("ReactionRollup")({
	url: S.String,
	total_count: S.Int,
	"+1": S.Int,
	"-1": S.Int,
	laugh: S.Int,
	confused: S.Int,
	heart: S.Int,
	hooray: S.Int,
	eyes: S.Int,
	rocket: S.Int,
}) {}

export class SubIssuesSummary extends S.Class<SubIssuesSummary>(
	"SubIssuesSummary",
)({
	total: S.Int,
	completed: S.Int,
	percent_completed: S.Int,
}) {}

export class IssueDependenciesSummary extends S.Class<IssueDependenciesSummary>(
	"IssueDependenciesSummary",
)({
	blocked_by: S.Int,
	blocking: S.Int,
	total_blocked_by: S.Int,
	total_blocking: S.Int,
}) {}

/**
 * The data type of the issue field
 */
export class IssueFieldValueDataType extends S.Literal(
	"text",
	"single_select",
	"number",
	"date",
) {}

/**
 * A value assigned to an issue field
 */
export class IssueFieldValue extends S.Class<IssueFieldValue>(
	"IssueFieldValue",
)({
	/**
	 * Unique identifier for the issue field.
	 */
	issue_field_id: S.Int,
	node_id: S.String,
	/**
	 * The data type of the issue field
	 */
	data_type: IssueFieldValueDataType,
	/**
	 * The value of the issue field
	 */
	value: S.NullOr(S.Union(S.String, S.Number, S.Int)),
	/**
	 * Details about the selected option (only present for single_select fields)
	 */
	single_select_option: S.optionalWith(
		S.Struct({
			/**
			 * Unique identifier for the option.
			 */
			id: S.Int,
			/**
			 * The name of the option
			 */
			name: S.String,
			/**
			 * The color of the option
			 */
			color: S.String,
		}),
		{ nullable: true },
	),
}) {}

/**
 * Issues are a great way to keep track of tasks, enhancements, and bugs for your projects.
 */
export class Issue extends S.Class<Issue>("Issue")({
	id: S.Int,
	node_id: S.String,
	/**
	 * URL for the issue
	 */
	url: S.String,
	repository_url: S.String,
	labels_url: S.String,
	comments_url: S.String,
	events_url: S.String,
	html_url: S.String,
	/**
	 * Number uniquely identifying the issue within its repository
	 */
	number: S.Int,
	/**
	 * State of the issue; either 'open' or 'closed'
	 */
	state: S.String,
	/**
	 * The reason for the current state
	 */
	state_reason: S.optionalWith(IssueStateReason, { nullable: true }),
	/**
	 * Title of the issue
	 */
	title: S.String,
	/**
	 * Contents of the issue
	 */
	body: S.optionalWith(S.String, { nullable: true }),
	user: S.NullOr(NullableSimpleUser),
	/**
	 * Labels to associate with this issue; pass one or more label names to replace the set of labels on this issue; send an empty array to clear all labels from the issue; note that the labels are silently dropped for users without push access to the repository
	 */
	labels: S.Array(
		S.Union(
			S.String,
			S.Struct({
				id: S.optionalWith(S.Int, { nullable: true }),
				node_id: S.optionalWith(S.String, { nullable: true }),
				url: S.optionalWith(S.String, { nullable: true }),
				name: S.optionalWith(S.String, { nullable: true }),
				description: S.optionalWith(S.String, { nullable: true }),
				color: S.optionalWith(S.String, { nullable: true }),
				default: S.optionalWith(S.Boolean, { nullable: true }),
			}),
		),
	),
	assignee: S.NullOr(NullableSimpleUser),
	assignees: S.optionalWith(S.Array(SimpleUser), { nullable: true }),
	milestone: S.NullOr(NullableMilestone),
	locked: S.Boolean,
	active_lock_reason: S.optionalWith(S.String, { nullable: true }),
	comments: S.Int,
	pull_request: S.optionalWith(
		S.Struct({
			merged_at: S.optionalWith(S.String, { nullable: true }),
			diff_url: S.NullOr(S.String),
			html_url: S.NullOr(S.String),
			patch_url: S.NullOr(S.String),
			url: S.NullOr(S.String),
		}),
		{ nullable: true },
	),
	closed_at: S.NullOr(S.String),
	created_at: S.String,
	updated_at: S.String,
	draft: S.optionalWith(S.Boolean, { nullable: true }),
	closed_by: S.optionalWith(NullableSimpleUser, { nullable: true }),
	body_html: S.optionalWith(S.String, { nullable: true }),
	body_text: S.optionalWith(S.String, { nullable: true }),
	timeline_url: S.optionalWith(S.String, { nullable: true }),
	type: S.optionalWith(IssueType, { nullable: true }),
	repository: S.optionalWith(Repository, { nullable: true }),
	performed_via_github_app: S.optionalWith(NullableIntegration, {
		nullable: true,
	}),
	author_association: S.optionalWith(AuthorAssociation, { nullable: true }),
	reactions: S.optionalWith(ReactionRollup, { nullable: true }),
	sub_issues_summary: S.optionalWith(SubIssuesSummary, { nullable: true }),
	/**
	 * URL to get the parent issue of this issue, if it is a sub-issue
	 */
	parent_issue_url: S.optionalWith(S.String, { nullable: true }),
	issue_dependencies_summary: S.optionalWith(IssueDependenciesSummary, {
		nullable: true,
	}),
	issue_field_values: S.optionalWith(S.Array(IssueFieldValue), {
		nullable: true,
	}),
}) {}

export class IssuesListForRepo200 extends S.Array(Issue) {}

/**
 * Validation Error
 */
export class ValidationError extends S.Class<ValidationError>(
	"ValidationError",
)({
	message: S.String,
	documentation_url: S.String,
	errors: S.optionalWith(
		S.Array(
			S.Struct({
				resource: S.optionalWith(S.String, { nullable: true }),
				field: S.optionalWith(S.String, { nullable: true }),
				message: S.optionalWith(S.String, { nullable: true }),
				code: S.String,
				index: S.optionalWith(S.Int, { nullable: true }),
				value: S.optionalWith(S.Union(S.String, S.Int, S.Array(S.String)), {
					nullable: true,
				}),
			}),
		),
		{ nullable: true },
	),
}) {}

export class IssuesCreateParams extends S.Struct({}) {}

export class IssuesCreateRequest extends S.Class<IssuesCreateRequest>(
	"IssuesCreateRequest",
)({
	/**
	 * The title of the issue.
	 */
	title: S.Union(S.String, S.Int),
	/**
	 * The contents of the issue.
	 */
	body: S.optionalWith(S.String, { nullable: true }),
	/**
	 * Login for the user that this issue should be assigned to. _NOTE: Only users with push access can set the assignee for new issues. The assignee is silently dropped otherwise. **This field is closing down.**_
	 */
	assignee: S.optionalWith(S.String, { nullable: true }),
	milestone: S.optionalWith(
		S.Union(
			S.String,
			/**
			 * The `number` of the milestone to associate this issue with. _NOTE: Only users with push access can set the milestone for new issues. The milestone is silently dropped otherwise._
			 */
			S.Int,
		),
		{ nullable: true },
	),
	/**
	 * Labels to associate with this issue. _NOTE: Only users with push access can set labels for new issues. Labels are silently dropped otherwise._
	 */
	labels: S.optionalWith(
		S.Array(
			S.Union(
				S.String,
				S.Struct({
					id: S.optionalWith(S.Int, { nullable: true }),
					name: S.optionalWith(S.String, { nullable: true }),
					description: S.optionalWith(S.String, { nullable: true }),
					color: S.optionalWith(S.String, { nullable: true }),
				}),
			),
		),
		{ nullable: true },
	),
	/**
	 * Logins for Users to assign to this issue. _NOTE: Only users with push access can set assignees for new issues. Assignees are silently dropped otherwise._
	 */
	assignees: S.optionalWith(S.Array(S.String), { nullable: true }),
	/**
	 * The name of the issue type to associate with this issue. _NOTE: Only users with push access can set the type for new issues. The type is silently dropped otherwise._
	 */
	type: S.optionalWith(S.String, { nullable: true }),
}) {}

export class IssuesCreate503 extends S.Struct({
	code: S.optionalWith(S.String, { nullable: true }),
	message: S.optionalWith(S.String, { nullable: true }),
	documentation_url: S.optionalWith(S.String, { nullable: true }),
}) {}

export const make = (
	httpClient: HttpClient.HttpClient,
	options: {
		readonly transformClient?:
			| ((
					client: HttpClient.HttpClient,
			  ) => Effect.Effect<HttpClient.HttpClient>)
			| undefined;
	} = {},
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
						description:
							typeof description === "string"
								? description
								: JSON.stringify(description),
					}),
				),
		);
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
		: (f) => (request) => Effect.flatMap(httpClient.execute(request), f);
	const decodeSuccess =
		<A, I, R>(schema: S.Schema<A, I, R>) =>
		(response: HttpClientResponse.HttpClientResponse) =>
			HttpClientResponse.schemaBodyJson(schema)(response);
	const decodeError =
		<const Tag extends string, A, I, R>(tag: Tag, schema: S.Schema<A, I, R>) =>
		(response: HttpClientResponse.HttpClientResponse) =>
			Effect.flatMap(
				HttpClientResponse.schemaBodyJson(schema)(response),
				(cause) => Effect.fail(ClientError(tag, cause, response)),
			);
	return {
		httpClient,
		appsListInstallationsForAuthenticatedUser: (options) =>
			HttpClientRequest.get(`/user/installations`).pipe(
				HttpClientRequest.setUrlParams({
					per_page: options?.per_page as any,
					page: options?.page as any,
				}),
				withResponse(
					HttpClientResponse.matchStatus({
						"2xx": decodeSuccess(AppsListInstallationsForAuthenticatedUser200),
						"401": decodeError("BasicError", BasicError),
						"403": decodeError("BasicError", BasicError),
						"304": () => Effect.void,
						orElse: unexpectedStatus,
					}),
				),
			),
		appsListInstallationReposForAuthenticatedUser: (installationId, options) =>
			HttpClientRequest.get(
				`/user/installations/${installationId}/repositories`,
			).pipe(
				HttpClientRequest.setUrlParams({
					per_page: options?.per_page as any,
					page: options?.page as any,
				}),
				withResponse(
					HttpClientResponse.matchStatus({
						"2xx": decodeSuccess(
							AppsListInstallationReposForAuthenticatedUser200,
						),
						"403": decodeError("BasicError", BasicError),
						"404": decodeError("BasicError", BasicError),
						"304": () => Effect.void,
						orElse: unexpectedStatus,
					}),
				),
			),
		issuesListForRepo: (owner, repo, options) =>
			HttpClientRequest.get(`/repos/${owner}/${repo}/issues`).pipe(
				HttpClientRequest.setUrlParams({
					milestone: options?.milestone as any,
					state: options?.state as any,
					assignee: options?.assignee as any,
					type: options?.type as any,
					creator: options?.creator as any,
					mentioned: options?.mentioned as any,
					labels: options?.labels as any,
					sort: options?.sort as any,
					direction: options?.direction as any,
					since: options?.since as any,
					per_page: options?.per_page as any,
					page: options?.page as any,
				}),
				withResponse(
					HttpClientResponse.matchStatus({
						"200": decodeSuccess(IssuesListForRepo200),
						"301": decodeSuccess(BasicError),
						"404": decodeError("BasicError", BasicError),
						"422": decodeError("ValidationError", ValidationError),
						orElse: unexpectedStatus,
					}),
				),
			),
		issuesCreate: (owner, repo, options) =>
			HttpClientRequest.post(`/repos/${owner}/${repo}/issues`).pipe(
				HttpClientRequest.bodyUnsafeJson(options.payload),
				withResponse(
					HttpClientResponse.matchStatus({
						"2xx": decodeSuccess(Issue),
						"400": decodeError("BasicError", BasicError),
						"403": decodeError("BasicError", BasicError),
						"404": decodeError("BasicError", BasicError),
						"410": decodeError("BasicError", BasicError),
						"422": decodeError("ValidationError", ValidationError),
						"503": decodeError("IssuesCreate503", IssuesCreate503),
						orElse: unexpectedStatus,
					}),
				),
			),
	};
};

export interface Client {
	readonly httpClient: HttpClient.HttpClient;
	/**
	 * Lists installations of your GitHub App that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access.
	 *
	 * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
	 *
	 * You can find the permissions for the installation under the `permissions` key.
	 */
	readonly appsListInstallationsForAuthenticatedUser: (
		options?:
			| typeof AppsListInstallationsForAuthenticatedUserParams.Encoded
			| undefined,
	) => Effect.Effect<
		typeof AppsListInstallationsForAuthenticatedUser200.Type,
		| HttpClientError.HttpClientError
		| ParseError
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"BasicError", typeof BasicError.Type>
	>;
	/**
	 * List repositories that the authenticated user has explicit permission (`:read`, `:write`, or `:admin`) to access for an installation.
	 *
	 * The authenticated user has explicit permission to access repositories they own, repositories where they are a collaborator, and repositories that they can access through an organization membership.
	 *
	 * The access the user has to each repository is included in the hash under the `permissions` key.
	 */
	readonly appsListInstallationReposForAuthenticatedUser: (
		installationId: string,
		options?:
			| typeof AppsListInstallationReposForAuthenticatedUserParams.Encoded
			| undefined,
	) => Effect.Effect<
		typeof AppsListInstallationReposForAuthenticatedUser200.Type,
		| HttpClientError.HttpClientError
		| ParseError
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"BasicError", typeof BasicError.Type>
	>;
	/**
	 * List issues in a repository. Only open issues will be listed.
	 *
	 * > [!NOTE]
	 * > GitHub's REST API considers every pull request an issue, but not every issue is a pull request. For this reason, "Issues" endpoints may return both issues and pull requests in the response. You can identify pull requests by the `pull_request` key. Be aware that the `id` of a pull request returned from "Issues" endpoints will be an _issue id_. To find out the pull request id, use the "[List pull requests](https://docs.github.com/rest/pulls/pulls#list-pull-requests)" endpoint.
	 *
	 * This endpoint supports the following custom media types. For more information, see "[Media types](https://docs.github.com/rest/using-the-rest-api/getting-started-with-the-rest-api#media-types)."
	 *
	 * - **`application/vnd.github.raw+json`**: Returns the raw markdown body. Response will include `body`. This is the default if you do not pass any specific media type.
	 * - **`application/vnd.github.text+json`**: Returns a text only representation of the markdown body. Response will include `body_text`.
	 * - **`application/vnd.github.html+json`**: Returns HTML rendered from the body's markdown. Response will include `body_html`.
	 * - **`application/vnd.github.full+json`**: Returns raw, text, and HTML representations. Response will include `body`, `body_text`, and `body_html`.
	 */
	readonly issuesListForRepo: (
		owner: string,
		repo: string,
		options?: typeof IssuesListForRepoParams.Encoded | undefined,
	) => Effect.Effect<
		typeof IssuesListForRepo200.Type | typeof BasicError.Type,
		| HttpClientError.HttpClientError
		| ParseError
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"ValidationError", typeof ValidationError.Type>
	>;
	/**
	 * Any user with pull access to a repository can create an issue. If [issues are disabled in the repository](https://docs.github.com/articles/disabling-issues/), the API returns a `410 Gone` status.
	 *
	 * This endpoint triggers [notifications](https://docs.github.com/github/managing-subscriptions-and-notifications-on-github/about-notifications). Creating content too quickly using this endpoint may result in secondary rate limiting. For more information, see "[Rate limits for the API](https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api#about-secondary-rate-limits)"
	 * and "[Best practices for using the REST API](https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api)."
	 *
	 * This endpoint supports the following custom media types. For more information, see "[Media types](https://docs.github.com/rest/using-the-rest-api/getting-started-with-the-rest-api#media-types)."
	 *
	 * - **`application/vnd.github.raw+json`**: Returns the raw markdown body. Response will include `body`. This is the default if you do not pass any specific media type.
	 * - **`application/vnd.github.text+json`**: Returns a text only representation of the markdown body. Response will include `body_text`.
	 * - **`application/vnd.github.html+json`**: Returns HTML rendered from the body's markdown. Response will include `body_html`.
	 * - **`application/vnd.github.full+json`**: Returns raw, text, and HTML representations. Response will include `body`, `body_text`, and `body_html`.
	 */
	readonly issuesCreate: (
		owner: string,
		repo: string,
		options: {
			readonly params?: typeof IssuesCreateParams.Encoded | undefined;
			readonly payload: typeof IssuesCreateRequest.Encoded;
		},
	) => Effect.Effect<
		typeof Issue.Type,
		| HttpClientError.HttpClientError
		| ParseError
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"BasicError", typeof BasicError.Type>
		| ClientError<"ValidationError", typeof ValidationError.Type>
		| ClientError<"IssuesCreate503", typeof IssuesCreate503.Type>
	>;
}

export interface ClientError<Tag extends string, E> {
	readonly _tag: Tag;
	readonly request: HttpClientRequest.HttpClientRequest;
	readonly response: HttpClientResponse.HttpClientResponse;
	readonly cause: E;
}

class ClientErrorImpl extends Data.Error<{
	_tag: string;
	cause: any;
	request: HttpClientRequest.HttpClientRequest;
	response: HttpClientResponse.HttpClientResponse;
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
	}) as any;
