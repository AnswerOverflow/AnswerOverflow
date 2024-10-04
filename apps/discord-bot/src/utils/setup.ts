import 'reflect-metadata';
import '@sapphire/plugin-hmr/register';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-editable-commands/register';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';
import { inspect } from 'util';
import * as colorette from 'colorette';

import {
	ApplicationCommandRegistries,
	RegisterBehavior,
} from '@sapphire/framework';

// Set default inspection depth
inspect.defaultOptions.depth = 1;
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
	RegisterBehavior.BulkOverwrite,
);

// Enable colorette
colorette.createColors({ useColor: true });
