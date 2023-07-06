import type { Story } from '@ladle/react';
import { Table, type TableProps } from './Table';
import {
	Tbody,
	Td,
	Th,
	Thead,
	Tr,
	TableButtonWrapper,
	TableButton,
} from './TableComps';
import { TrashIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';

export const Primary: Story<TableProps> = () => (
	<div className="2xl:w-[85rem]">
		<Table>
			<Thead>
				<Th>First name</Th>
				<Th>Last name</Th>
				<Th>Username</Th>
				<Th>Email</Th>
				<Th>Actions</Th>
			</Thead>
			<Tbody>
				<Tr>
					<Td>John</Td>
					<Td>Doe</Td>
					<Td>doe01</Td>
					<Td>example@example.com</Td>
					<Td>
						<TableButtonWrapper>
							<TableButton backgroundColor="#E6E6E6" ariaLabel="Settings">
								<Cog6ToothIcon color="#282828" />
							</TableButton>
							<TableButton backgroundColor="#D61E1E" ariaLabel="Delete">
								<TrashIcon color="#E6E6E6" />
							</TableButton>
						</TableButtonWrapper>
					</Td>
				</Tr>
				<Tr>
					<Td>John2</Td>
					<Td>Doe2</Td>
					<Td>doe02</Td>
					<Td>example2@example.com</Td>
					<Td>Test2</Td>
				</Tr>
			</Tbody>
		</Table>
	</div>
);
