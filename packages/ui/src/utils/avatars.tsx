export function getInitials(name: string) {
	const onlyLetters = name.replace(/[^a-zA-Z ]/g, '').toUpperCase();
	const words = onlyLetters.split(' ');
	const initials = words.map((word) => word[0]);
	return initials.join('').slice(0, 3);
}
