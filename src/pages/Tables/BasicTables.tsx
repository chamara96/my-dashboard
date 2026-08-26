import { useState, useEffect, FormEvent } from "react";
import { ref, push, onValue } from "firebase/database";
import { db } from "../../lib/firebase";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne, {
  FirebaseProject,
} from "../../components/tables/BasicTables/BasicTableOne";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

export default function BasicTables() {
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<FirebaseProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const projectsRef = ref(db, "projects");
    const unsubscribe = onValue(
      projectsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list: FirebaseProject[] = Object.entries(data).map(
            ([id, value]) => ({
              id,
              ...(value as Omit<FirebaseProject, "id">),
            })
          );
          setProjects(list);
        } else {
          setProjects([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !status.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await push(ref(db, "projects"), {
        projectName: projectName.trim(),
        status: status.trim(),
      });
      setProjectName("");
      setStatus("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Basic Tables" />
      <div className="space-y-6">
        <ComponentCard title="Add Project">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                type="text"
                id="projectName"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                type="text"
                id="status"
                placeholder="Active / Pending / Cancel"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !projectName.trim() || !status.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "Add Project"}
            </button>
          </form>
        </ComponentCard>

        <ComponentCard title="Basic Table 1">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              Loading projects…
            </p>
          ) : (
            <BasicTableOne firebaseData={projects} />
          )}
        </ComponentCard>
      </div>
    </>
  );
}
