import styles from './loading-spinner.module.css';

export function LoadingSpinner(props: { className?: string }) {
	return (
		<div className={`${styles.spinner ?? ''} ${props.className ?? ''}`}>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
	);
}
