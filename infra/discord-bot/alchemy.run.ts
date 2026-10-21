import * as Alchemy from "alchemy";
import * as AWS from "alchemy/AWS";
import * as CloudControl from "alchemy/AWS/CloudControl";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

// One EC2 host running the Discord bot under Docker Compose. Runtime secrets
// are SSM SecureString parameters written outside this stack, so they never
// enter Alchemy state or source. See README.md for the parameter contract.

const hostScript = (name: string) =>
	Effect.promise(() =>
		Bun.file(new URL(`./host/${name}`, import.meta.url)).text(),
	);

export default Alchemy.Stack(
	"AnswerOverflowDiscordBot",
	{
		providers: AWS.providers(),
		state: AWS.state({ prefix: "answeroverflow-discord-bot" }),
	},
	Effect.gen(function* () {
		const stage = yield* Alchemy.Stage;
		const name = `answeroverflow-discord-bot-${stage}`;
		const parameterPath = `/answeroverflow/${stage}/discord-bot`;

		// Pinned so routine AMI releases never force a replacement. Look up the
		// current AL2023 x86_64 AMI with the command in README.md.
		const amiId = yield* Config.NonEmptyString("BOT_AMI_ID");
		const instanceType = yield* Config.NonEmptyString("BOT_INSTANCE_TYPE").pipe(
			Config.withDefault("r7i.large"),
		);
		const bucketName = yield* Config.NonEmptyString("BOT_BUCKET_NAME");

		const tags = {
			Project: "answeroverflow",
			Service: "discord-bot",
			Stage: stage,
		};

		const network = yield* AWS.EC2.Network("Network", {
			cidrBlock: "10.60.0.0/16",
			availabilityZones: 1,
			nat: "none",
			tags,
		});

		// No inbound rules. Operators use SSM Session Manager / Run Command.
		const securityGroup = yield* AWS.EC2.SecurityGroup("SecurityGroup", {
			vpcId: network.vpcId,
			groupName: name,
			description: "Answer Overflow Discord bot (egress only)",
			ingress: [],
			egress: [{ ipProtocol: "-1", cidrIpv4: "0.0.0.0/0" }],
			tags,
		});

		const role = yield* AWS.IAM.Role("Role", {
			roleName: name,
			description: "Answer Overflow Discord bot EC2 host",
			assumeRolePolicyDocument: {
				Version: "2012-10-17",
				Statement: [
					{
						Effect: "Allow",
						Principal: { Service: "ec2.amazonaws.com" },
						Action: ["sts:AssumeRole"],
					},
				],
			},
			managedPolicyArns: [
				"arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
			],
			inlinePolicies: {
				runtime: {
					Version: "2012-10-17",
					Statement: [
						{
							Sid: "ReadRuntimeParameters",
							Effect: "Allow",
							Action: [
								"ssm:GetParametersByPath",
								"ssm:GetParameters",
								"ssm:GetParameter",
							],
							Resource: [
								`arn:aws:ssm:*:*:parameter${parameterPath}`,
								`arn:aws:ssm:*:*:parameter${parameterPath}/*`,
							],
						},
						{
							Sid: "WriteBotObjects",
							Effect: "Allow",
							Action: ["s3:PutObject", "s3:AbortMultipartUpload"],
							Resource: [`arn:aws:s3:::${bucketName}/*`],
						},
					],
				},
			},
			tags,
		});

		const instanceProfile = yield* AWS.IAM.InstanceProfile("InstanceProfile", {
			instanceProfileName: name,
			roleName: role.roleName,
			tags,
		});

		yield* AWS.SSM.Parameter("BucketNameParameter", {
			name: `${parameterPath}/BUCKET_NAME`,
			type: "String",
			value: bucketName,
			tags,
		});

		// Runs once, on first boot. Changing it does not reconfigure a running host.
		const userData = (yield* hostScript("bootstrap.sh")).replace(
			"__PARAMETER_PATH__",
			() => parameterPath,
		);

		const instance = yield* CloudControl.Resource("Instance", {
			typeName: "AWS::EC2::Instance",
			desiredState: {
				ImageId: amiId,
				InstanceType: instanceType,
				SubnetId: network.publicSubnetIds[0],
				SecurityGroupIds: [securityGroup.groupId],
				IamInstanceProfile: instanceProfile.instanceProfileName,
				MetadataOptions: {
					HttpTokens: "required",
					HttpEndpoint: "enabled",
					// The bot container reaches IMDS through the Docker bridge.
					HttpPutResponseHopLimit: 2,
				},
				BlockDeviceMappings: [
					{
						DeviceName: "/dev/xvda",
						Ebs: {
							VolumeType: "gp3",
							VolumeSize: 40,
							Encrypted: true,
							DeleteOnTermination: true,
						},
					},
				],
				UserData: Buffer.from(userData).toString("base64"),
				PropagateTagsToVolumeOnCreation: true,
				Tags: Object.entries({ ...tags, Name: name }).map(([Key, Value]) => ({
					Key,
					Value,
				})),
			},
		});

		return {
			instanceId: instance.identifier,
			parameterPath,
			roleName: role.roleName,
		};
	}),
);
