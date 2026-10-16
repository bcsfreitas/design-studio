// eru's new session page (features/sessions/NewSessionPage.tsx): the title, the Notch with the project and the branch,
// and the centred message field. Sending starts the session.
import { useState } from 'react';
import { useNavigate } from '@module/prototypes';
import { Input } from '@/systems/eru/components/input';
import { Notch, type NotchItem } from '@/systems/eru/components/notch';
import { SealIcon } from '@/systems/eru/components/seal-icon';
import { FolderInput, GitBranch } from '@/systems/eru/libraries/icons';
import { PROJECTS } from '../data/workspace';
import AppShell, { PageTrail } from '../shell/AppShell';
import { Composer } from './Composer';

const OTHER = 'outra';
const DEFAULT = '/home/hermes';

const FOLDERS = [{ path: DEFAULT, title: 'Projeto padrão', seal: null as string | null }, ...PROJECTS.map(project => ({ path: project.path.replace('~', '/home/hermes'), title: project.label, seal: project.seal }))];

function FolderLabel({ title, detail }: { title: string; detail?: string }) {
  return (
    <span className="flex max-w-[min(26rem,calc(100vw-6rem))] min-w-0 flex-col">
      <span className="truncate">{title}</span>
      {detail ? <span className="truncate font-mono text-[11px] font-normal opacity-70">{detail}</span> : null}
    </span>
  );
}

export function NewSessionScreen({ problem: initialProblem = null }: { problem?: string | null }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEFAULT);
  const [branch, setBranch] = useState('main');
  const [other, setOther] = useState('');
  const [problem, setProblem] = useState(initialProblem);
  const chosen = FOLDERS.find(folder => folder.path === selected);
  const icon = (seal: string | null) => <SealIcon seal={seal} tone="inherit" decorative />;

  const items: NotchItem[] = [
    {
      id: 'projeto',
      label: 'Projeto',
      icon: chosen ? icon(chosen.seal) : <FolderInput className="size-3.5 text-[#a3a3a3]" aria-hidden />,
      value: selected,
      valueLabel: selected === OTHER ? 'Outro projeto' : chosen?.title,
      options: [
        ...FOLDERS.map(folder => ({ id: folder.path, label: <FolderLabel title={folder.title} detail={folder.path} />, icon: icon(folder.seal) })),
        { id: OTHER, label: <FolderLabel title="Outro projeto" />, icon: <FolderInput className="size-3.5" aria-hidden /> },
      ],
      onChange: next => {
        setSelected(next);
        setBranch('main');
        setProblem(null);
      },
    },
  ];

  if (chosen?.path.endsWith('/eru')) {
    items.push({
      id: 'branch',
      label: 'Branch',
      icon: <GitBranch className="size-3.5 text-[#a3a3a3]" aria-hidden />,
      value: branch,
      valueLabel: branch,
      options: ['main', 'tirion', 'telperion'].map(name => ({ id: name, label: <FolderLabel title={name} detail={name === 'main' ? chosen.path : `${chosen.path}/.worktrees/${name}`} />, icon: <GitBranch className="size-3.5" aria-hidden /> })),
      onChange: setBranch,
    });
  }

  return (
    <AppShell current="nova-sessao" bar={<PageTrail steps={[{ label: 'Nova sessão' }]} />} fill>
      <div className="quiet-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-1 flex-col justify-center gap-5">
            <div className="flex flex-col items-start gap-4">
              <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">Nova sessão</h1>
              <Notch items={items} />
              {selected === OTHER ? (
                <Input aria-label="Caminho do projeto" placeholder="/caminho/no/servidor" value={other} onChange={event => setOther(event.target.value)} className="max-w-md font-mono" autoFocus />
              ) : null}
            </div>
            {problem ? (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {problem}
              </p>
            ) : null}
            <Composer
              placeholder="O que o agente deve fazer?"
              usage={{ model: 'claude-opus-5-5', used: null, max: null }}
              autoFocus
              onSend={() => {
                if (selected === OTHER && !other.trim()) {
                  setProblem('Escreva o caminho do projeto no servidor.');
                  return;
                }
                navigate('Sessão/Estados/Respondendo');
              }}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
