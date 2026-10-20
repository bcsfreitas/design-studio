import { Button } from '@/systems/endless-studios/components/button';
import { Card } from '@/systems/endless-studios/components/card';

export const Default = () => (
  <Card title='Game Design Foundations' description='Spring 2027 · 24 learners'>
    <p className='text-sm'>Learners build a small platformer over eight weeks, one mechanic at a time.</p>
  </Card>
);

export const Variants = () => (
  <div className='grid w-full grid-cols-2 gap-4'>
    {(['outline', 'bordered', 'soft', 'subtle', 'ghost', 'flat', 'solid'] as const).map(variant => (
      <Card key={variant} variant={variant} title={variant[0].toUpperCase() + variant.slice(1)}>
        <p className='text-sm'>Learners build a small platformer, one mechanic at a time.</p>
      </Card>
    ))}
  </div>
);

export const HeaderAndFooter = () => (
  <Card
    header={
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h3 className='text-highlighted font-semibold'>Archive this cohort?</h3>
          <p className='text-muted text-sm mt-1'>Learners keep their projects, but nobody can join anymore.</p>
        </div>
      </div>
    }
    footer={
      <div className='flex justify-end gap-2'>
        <Button color='neutral' variant='ghost'>
          Cancel
        </Button>
        <Button color='error'>Archive Cohort</Button>
      </div>
    }
  >
    <p className='text-sm'>24 learners and 3 facilitators are in this cohort.</p>
  </Card>
);

export const SoftInsideOutline = () => (
  <Card title='Cohort leader'>
    <Card variant='soft'>
      <p className='text-highlighted font-medium text-sm'>maria.oliveira</p>
      <p className='text-toned text-xs'>Maria Oliveira</p>
    </Card>
  </Card>
);

export const FlushBody = () => (
  <Card title='Members' ui={{ body: 'p-0 sm:p-0' }}>
    <ul className='divide-y divide-default'>
      {['Ana Souza', 'João Lima', 'Carla Reis'].map(name => (
        <li key={name} className='flex items-center justify-between px-4 py-3 sm:px-6 text-sm'>
          {name}
          <span className='text-muted'>Learner</span>
        </li>
      ))}
    </ul>
  </Card>
);
