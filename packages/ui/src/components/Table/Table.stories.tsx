import type { Meta, StoryFn } from "@storybook/react";
import { Table } from "./Table";
import { Tbody, Td, Th, Thead, Tr } from "./TableComps";
export default {
  component: Table,
} as Meta;

const Template: StoryFn<typeof Table> = () => (
  <Table>
    <Thead>
      <Th>foo</Th>
    </Thead>
    <Tbody>
      <Tr>
        <Td>Test</Td>
      </Tr>
    </Tbody>
  </Table>
);

export const Primary = Template.bind({});
