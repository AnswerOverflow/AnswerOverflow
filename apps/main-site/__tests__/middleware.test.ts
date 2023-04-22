import { NextRequest } from 'next/server';
import { rewriteToMainSite, toPathHandlerData } from '../src/middleware';

// Community Page
//  Main Site:
//    No subscription: continue to /c/ on main site
//    Has subscription: redirect to / on tenant site
//  Tenant Site:
//    No subscription: redirect to /c/ on answer overflow
//    Has subscription: redirect to / on tenant site
describe('community page', () => {
	describe('main site', () => {});
	describe('tenant site', () => {});
});

// Message Page
//  Main Site:
//    No subscription: continue to /m/ on main site
//    Has subscription: redirect to / on tenant site
//  Tenant Site:
//    No subscription: redirect to /m/ on answer overflow
//    Has subscription: redirect to / on tenant site
describe('message page', () => {
	describe('main site', () => {});
	describe('tenant site', () => {});
});

// Home Page
//  Main Site:
//   Continue to / on main site
//  Tenant Site:
//   Rewrite to /c/ on answer overflow
describe('home page', () => {
	describe('main site', () => {});
	describe('tenant site', () => {});
});

// api
//  Request direct from main site:
//   Continue to /api/ on main site
//  CORS request from tenant site:
//   Continue to /api/ on main site with CORS headers
describe('api', () => {
	describe('main site', () => {});
	describe('tenant site', () => {});
});
