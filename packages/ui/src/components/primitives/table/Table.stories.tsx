import type { Meta, StoryFn } from "@storybook/react";
import { Table } from "./Table";
import { Tbody, Td, Th, Thead, Tr, TableButtonWrapper, TableButton } from "./TableComps";
export default {
  component: Table,
} as Meta;

import { TrashIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";

const Template: StoryFn<typeof Table> = () => (
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
              <TableButton background_color="#E6E6E6">
                <Cog6ToothIcon color="#282828" />
              </TableButton>
              <TableButton background_color="#D61E1E">
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

export const Primary = Template.bind({});
