import type React from "react";
import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { useNavigate } from "react-router-dom";

import { listProjectSummaries, type ProjectSummary } from "../../lib/storage/project-store";

export function ProjectList(): React.JSX.Element {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);

  useEffect(() => {
    void listProjectSummaries().then(setProjects);
  }, []);

  return (
    <Card title="Resume an existing local project" className="border-slate-800 bg-slate-950/80 text-slate-100">
      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">Your imported drafts will appear here.</p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 px-4 py-3">
              <div>
                <p className="font-medium text-slate-100">{project.name}</p>
                <p className="text-sm text-slate-400">Updated {new Date(project.updatedAt).toLocaleString()}</p>
              </div>
              <Button onClick={() => navigate(`/projects/${project.id}`)}>Open</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}