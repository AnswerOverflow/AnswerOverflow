'use client';
import { signIn } from 'next-auth/react';
export const ClientAutoSignIn = () => {
	if (typeof window !== 'undefined') void signIn('discord', {});
	return <></>;
};
