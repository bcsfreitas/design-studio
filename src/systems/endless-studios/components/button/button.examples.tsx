import { Button } from '@/systems/endless-studios/components/button';

export const Default = () => <Button>Invite Learners</Button>;

export const CommonPairs = () => (
  <>
    <Button>Save Changes</Button>
    <Button color='neutral' variant='outline'>
      Cancel
    </Button>
    <Button color='neutral' variant='ghost'>
      Skip for Now
    </Button>
    <Button color='secondary' variant='ghost'>
      Share
    </Button>
    <Button color='neutral' variant='link'>
      View All
    </Button>
  </>
);

export const Variants = () => (
  <>
    <Button variant='solid'>Solid</Button>
    <Button variant='outline'>Outline</Button>
    <Button variant='soft'>Soft</Button>
    <Button variant='subtle'>Subtle</Button>
    <Button variant='ghost'>Ghost</Button>
    <Button variant='link'>Link</Button>
  </>
);

export const Colors = () => (
  <>
    <Button color='primary'>Primary</Button>
    <Button color='secondary'>Secondary</Button>
    <Button color='kids'>Kids</Button>
    <Button color='info'>Info</Button>
    <Button color='success'>Success</Button>
    <Button color='warning'>Warning</Button>
    <Button color='error'>Error</Button>
    <Button color='neutral'>Neutral</Button>
  </>
);

export const Sizes = () => (
  <>
    <Button size='xs'>Extra Small</Button>
    <Button size='sm'>Small</Button>
    <Button size='md'>Medium</Button>
    <Button size='lg'>Large</Button>
    <Button size='xl'>Extra Large</Button>
  </>
);

export const WithIcons = () => (
  <>
    <Button icon='i-lucide-user-plus'>Invite Learners</Button>
    <Button color='neutral' variant='outline' trailingIcon='i-lucide-arrow-right'>
      Next Step
    </Button>
    <Button color='neutral' variant='outline' icon='i-lucide-ellipsis' square aria-label='More actions' />
    <Button color='error' variant='ghost' icon='i-lucide-trash-2' square aria-label='Delete' />
  </>
);

export const States = () => (
  <>
    <Button loading>Publishing</Button>
    <Button disabled>Publish</Button>
    <Button color='neutral' variant='outline' disabled>
      Cancel
    </Button>
  </>
);

export const KidsGating = () => (
  <Button color='kids' variant='gating' trailingIcon='i-lucide-lock'>
    Ask a Parent
  </Button>
);

export const Contrast = () => (
  <div className='flex gap-2 rounded-2xl bg-bg-inverted p-4 text-text-inverted'>
    <Button variant='contrast' icon='i-lucide-play'>
      Watch Trailer
    </Button>
    <Button variant='contrast' icon='i-lucide-heart' square aria-label='Like' />
  </div>
);

export const Block = () => (
  <Button block icon='i-lucide-log-in'>
    Log In
  </Button>
);
