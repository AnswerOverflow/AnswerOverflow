import type { Story } from '@ladle/react';
import { Button } from './Button';

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>

export const Primary: Story<ButtonProps> = (props) => (
  <Button {...props}>Test</Button>
)

Primary.args = {
  variant: 'default',
};

export const Destructive = Primary.bind({})
Destructive.args = {
  variant: "destructive"
}

export const Outline = Primary.bind({})
Outline.args = {
  variant: "outline"
}

export const Subtle = Primary.bind({})
Subtle.args = {
  variant: 'subtle',
};

export const Ghost = Primary.bind({})
Ghost.args = {
  variant: "ghost"
}

