"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader, KpiTile } from "@/components/hub";
import { IconAlertCircle, IconCheck, IconCheckSquare, IconClock, IconZap, IconClipboardList, IconFileText } from "@/components/icons";

interface Task {
  id: string;
  priority: string;
  category: string;
  task: string;
  status: string;
  hours: number;
  owner: string;
  notes: string;
}

interface SitemapItem {
  url: string;
  title: string;
  access: string;
  type: string;
}

const tasks: Task[] = [
  { id: "IMG-001", priority: "CRITICAL", category: "Images", task: "Compress dumbbells-closeup.jpg from 9.1MB to <500KB (WebP)", status: "Not Started", hours: 2, owner: "Craig", notes: "Large unoptimized image slowing site" },
  { id: "TEST-001", priority: "CRITICAL", category: "Testing", task: "Verify staging site loads all pages properly", status: "Not Started", hours: 3, owner: "Craig", notes: "Test on staging.eternal-fitness.co.uk" },
  { id: "ANAL-001", priority: "CRITICAL", category: "Analytics", task: "Verify GA4 and conversion tracking on staging", status: "Not Started", hours: 1, owner: "Craig", notes: "Check that analytics events fire correctly" },
  { id: "SEO-001", priority: "CRITICAL", category: "SEO", task: "SEO metadata audit — titles/descriptions on all key pages", status: "Not Started", hours: 2, owner: "Craig", notes: "Check consistency with brand guidelines" },

  { id: "STRUCT-001", priority: "HIGH", category: "Structure", task: "Review homepage content and hero section", status: "Not Started", hours: 2, owner: "Craig", notes: "Verify CTA alignment with pricing" },
  { id: "STRUCT-002", priority: "HIGH", category: "Structure", task: "Verify Personal Training page content", status: "Not Started", hours: 1.5, owner: "Craig", notes: "Ensure copy matches agreement and PAR-Q" },
  { id: "STRUCT-003", priority: "HIGH", category: "Structure", task: "Check pricing page accuracy", status: "Not Started", hours: 1, owner: "Craig", notes: "Confirm £40/£35 rates" },
  { id: "IMG-002", priority: "HIGH", category: "Images", task: "Audit all images for broken references and alt text", status: "Not Started", hours: 2, owner: "Craig", notes: "Accessibility check" },
  { id: "IMG-003", priority: "HIGH", category: "Images", task: "Verify Esther photos usage", status: "Not Started", hours: 1, owner: "Craig", notes: "Audit multiple versions for consistency" },
  { id: "CONT-001", priority: "HIGH", category: "Content", task: "Verify brand voice consistency", status: "Not Started", hours: 2, owner: "Craig", notes: "Check homepage, about, pricing" },
  { id: "CONT-002", priority: "HIGH", category: "Content", task: "Check equipment references", status: "Not Started", hours: 1, owner: "Craig", notes: "Verify all equipment exists in studio" },
  { id: "CONT-003", priority: "HIGH", category: "Content", task: "Verify clinical population language", status: "Not Started", hours: 1, owner: "Craig", notes: "Clinical framing for rehab/cancer clients" },

  { id: "TECH-001", priority: "MEDIUM", category: "Technical", task: "Run Lighthouse audit on key pages", status: "Not Started", hours: 1.5, owner: "Craig", notes: "Check Core Web Vitals" },
  { id: "TECH-002", priority: "MEDIUM", category: "Technical", task: "Test mobile responsiveness", status: "Not Started", hours: 2, owner: "Craig", notes: "375px, 768px, 1024px breakpoints" },
  { id: "TECH-003", priority: "MEDIUM", category: "Technical", task: "Test contact form submission", status: "Not Started", hours: 1, owner: "Craig", notes: "Verify email delivery" },
  { id: "TECH-004", priority: "MEDIUM", category: "Technical", task: "Test PAR-Q form (ParqEditClient)", status: "Not Started", hours: 1.5, owner: "Craig", notes: "End-to-end: fill, save, edit, submit" },
  { id: "TECH-005", priority: "MEDIUM", category: "Technical", task: "Test internal links", status: "Not Started", hours: 1, owner: "Craig", notes: "Check for broken navigation" },
  { id: "STRUCT-004", priority: "MEDIUM", category: "Structure", task: "Review blog section", status: "Not Started", hours: 1, owner: "Craig", notes: "Post count and SEO status" },
  { id: "STRUCT-005", priority: "MEDIUM", category: "Structure", task: "Check About/Philosophy", status: "Not Started", hours: 1.5, owner: "Craig", notes: "Brand voice and positioning" },
  { id: "CONT-004", priority: "MEDIUM", category: "Content", task: "Verify testimonials/stories", status: "Not Started", hours: 1, owner: "Craig", notes: "Use real examples from references" },
  { id: "CONT-005", priority: "MEDIUM", category: "Content", task: "Confirm pricing copy everywhere", status: "Not Started", hours: 1, owner: "Craig", notes: "£480 (12), £840 (24)" },
  { id: "IMG-004", priority: "MEDIUM", category: "Images", task: "Verify coach photos have consent", status: "Not Started", hours: 1, owner: "Craig", notes: "john, patricia, sarah" },
  { id: "IMG-005", priority: "MEDIUM", category: "Images", task: "Check studio/equipment photos", status: "Not Started", hours: 1, owner: "Craig", notes: "Real studio, not stock" },
  { id: "TECH-007", priority: "MEDIUM", category: "Technical", task: "Test 404 error page", status: "Not Started", hours: 0.5, owner: "Craig", notes: "Styling and helpfulness" },

  { id: "HUB-001", priority: "LOW", category: "Hub", task: "Test client dashboard", status: "Not Started", hours: 1.5, owner: "Craig", notes: "View plans and sessions" },
  { id: "HUB-002", priority: "LOW", category: "Hub", task: "Test training block creation", status: "Not Started", hours: 1.5, owner: "Craig", notes: "End-to-end workflow" },
  { id: "HUB-003", priority: "LOW", category: "Hub", task: "Test session tracker", status: "Not Started", hours: 1, owner: "Craig", notes: "Display and logging" },
  { id: "HUB-004", priority: "LOW", category: "Hub", task: "Test agreement viewing", status: "Not Started", hours: 1, owner: "Craig", notes: "View, sign, download" },
  { id: "HUB-005", priority: "LOW", category: "Hub", task: "Test agreement email", status: "Not Started", hours: 1, owner: "Craig", notes: "Email functionality" },
  { id: "COMP-001", priority: "LOW", category: "Compliance", task: "Check Privacy Policy", status: "Not Started", hours: 0.5, owner: "Craig", notes: "Current and accurate" },
  { id: "COMP-002", priority: "LOW", category: "Compliance", task: "Check Terms & Conditions", status: "Not Started", hours: 0.5, owner: "Craig", notes: "Complete?" },
  { id: "COMP-003", priority: "LOW", category: "Compliance", task: "Check Cookies Policy", status: "Not Started", hours: 1, owner: "Craig", notes: "GDPR compliance" },
  { id: "COMP-004", priority: "LOW", category: "Compliance", task: "Verify Agreement version", status: "Not Started", hours: 0.5, owner: "Craig", notes: "PDF generation" },
  { id: "COMP-005", priority: "LOW", category: "Compliance", task: "Verify PAR-Q form", status: "Not Started", hours: 0.5, owner: "Craig", notes: "Latest version" },
  { id: "PERF-002", priority: "LOW", category: "Performance", task: "Check N+1 queries", status: "Not Started", hours: 2, owner: "Craig", notes: "Hub API profiling" },
  { id: "PERF-003", priority: "LOW", category: "Performance", task: "Verify API response times", status: "Not Started", hours: 1.5, owner: "Craig", notes: "<500ms target" },
  { id: "MAINT-001", priority: "LOW", category: "Maintenance", task: "Review bug backlog", status: "Not Started", hours: 1, owner: "Craig", notes: "Response time <48hrs" },
  { id: "MAINT-002", priority: "LOW", category: "Maintenance", task: "Confirm 99.5% uptime", status: "Not Started", hours: 1, owner: "Craig", notes: "Verify achievable" },
  { id: "MAINT-003", priority: "LOW", category: "Maintenance", task: "Check training plan library", status: "Not Started", hours: 1, owner: "Craig", notes: "Published count" },
  { id: "MAINT-004", priority: "LOW", category: "Maintenance", task: "Review social linking", status: "Not Started", hours: 0.5, owner: "Craig", notes: "Back to website" },
];

const sitemap: SitemapItem[] = [
  { url: "/", title: "Home", access: "Public", type: "Landing" },
  { url: "/about", title: "About Esther", access: "Public", type: "Info" },
  { url: "/personal-training", title: "Personal Training", access: "Public", type: "Services" },
  { url: "/pricing", title: "Pricing & Packages", access: "Public", type: "Services" },
  { url: "/contact", title: "Contact Form", access: "Public", type: "Contact" },
  { url: "/blog", title: "Blog Home", access: "Public", type: "Content" },
  { url: "/blog/[slug]", title: "Blog Post", access: "Public", type: "Content" },
  { url: "/faqs", title: "FAQs", access: "Public", type: "Support" },
  { url: "/parq", title: "PAR-Q Medical Form", access: "Public", type: "Form" },
  { url: "/parq/edit/[id]", title: "PAR-Q Edit", access: "Public", type: "Form" },
  { url: "/agreement", title: "Agreement Info", access: "Public", type: "Legal" },
  { url: "/privacy-policy", title: "Privacy Policy", access: "Public", type: "Legal" },
  { url: "/terms", title: "Terms & Conditions", access: "Public", type: "Legal" },
  { url: "/cookies-policy", title: "Cookies Policy", access: "Public", type: "Legal" },
  { url: "/hub/login", title: "Hub Login", access: "Public (Auth Gate)", type: "Auth" },
  { url: "/hub", title: "Dashboard", access: "Protected", type: "Hub" },
  { url: "/hub/clients", title: "Client List", access: "Protected", type: "Hub" },
  { url: "/hub/clients/new", title: "Add New Client", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]", title: "Client Detail", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]/edit", title: "Edit Client", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]/blocks", title: "Training Blocks", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]?tab=plan-agent", title: "Plan Agent — Create Block", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]/blocks/[blockId]", title: "Block Detail", access: "Protected", type: "Hub" },
  { url: "/hub/clients/[id]/blocks/[blockId]/sessions/[sessionNum]", title: "Session Detail", access: "Protected", type: "Hub" },
  { url: "/hub/agreements", title: "Agreements", access: "Protected", type: "Hub" },
  { url: "/hub/agreements/[id]", title: "Agreement Detail", access: "Protected", type: "Hub" },
  { url: "/hub/exercises", title: "Exercise Library", access: "Protected", type: "Hub" },
  { url: "/hub/tracker", title: "Session Tracker", access: "Protected", type: "Hub" },
];

const priorityConfig = {
  CRITICAL: { color: "bg-rose/10 text-rose", icon: IconAlertCircle },
  HIGH: { color: "bg-dark-navy/10 text-dark-navy", icon: IconZap },
  MEDIUM: { color: "bg-teal/10 text-teal", icon: IconClock },
  LOW: { color: "bg-slate/10 text-slate", icon: IconCheckSquare },
};

export default function SiteReviewPage() {
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("NOT_COMPLETE");
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("task-statuses");
    if (saved) {
      setTaskStatuses(JSON.parse(saved));
    }
  }, []);

  const updateTaskStatus = (taskId: string, newStatus: string) => {
    const updated = { ...taskStatuses, [taskId]: newStatus };
    setTaskStatuses(updated);
    localStorage.setItem("task-statuses", JSON.stringify(updated));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const customStatus = taskStatuses[task.id];
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && task.category !== categoryFilter) return false;

      if (statusFilter === "NOT_COMPLETE") {
        return customStatus !== "Complete";
      } else if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [priorityFilter, categoryFilter, statusFilter, taskStatuses]);

  const completedCount = Object.values(taskStatuses).filter((s) => s === "Complete").length;

  const stats = {
    total: tasks.length,
    critical: tasks.filter((t) => t.priority === "CRITICAL").length,
    hours: tasks.reduce((sum, t) => sum + t.hours, 0),
    public: sitemap.filter((s) => s.access === "Public").length,
    protected: sitemap.filter((s) => s.access === "Protected").length,
  };

  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  const statuses = Array.from(new Set(tasks.map((t) => t.status)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Site Review & Tasks</h1>
        <p className="text-muted-foreground mt-1">Website audit checklist and project structure</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-6">
        <KpiTile
          statusToken="primary"
          icon={<IconClipboardList className="w-5 h-5" />}
          label="Total Tasks"
          value={stats.total}
        />
        <KpiTile
          statusToken="success"
          icon={<IconCheck className="w-5 h-5" />}
          label="Completed"
          value={completedCount}
        />
        <KpiTile
          statusToken="danger"
          icon={<IconAlertCircle className="w-5 h-5" />}
          label="Critical Issues"
          value={stats.critical}
        />
        <KpiTile
          statusToken="neutral"
          icon={<IconClock className="w-5 h-5" />}
          label="Est. Hours"
          value={`${stats.hours}h`}
        />
        <KpiTile
          statusToken="primary"
          icon={<IconFileText className="w-5 h-5" />}
          label="Public Pages"
          value={stats.public}
        />
        <KpiTile
          statusToken="primary"
          icon={<IconFileText className="w-5 h-5" />}
          label="Hub Pages"
          value={stats.protected}
        />
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <div className="inline-flex w-full max-w-full justify-start gap-1 flex-wrap rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-[5px] shadow-sm mb-6">
          <TabsTrigger value="tasks" className="rounded-lg border-0 px-3.5 py-2 text-sm font-medium data-[state=active]:bg-[var(--hub-sidebar-active)] data-[state=active]:font-semibold data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-[var(--hub-hover)] hover:data-[state=inactive]:text-foreground">
            Tasks ({filteredTasks.length})
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="rounded-lg border-0 px-3.5 py-2 text-sm font-medium data-[state=active]:bg-[var(--hub-sidebar-active)] data-[state=active]:font-semibold data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-[var(--hub-hover)] hover:data-[state=inactive]:text-foreground">
            Sitemap ({sitemap.length})
          </TabsTrigger>
        </div>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_COMPLETE">Active Tasks</SelectItem>
                <SelectItem value="ALL">All Tasks</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showCompleted ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="ml-auto gap-1.5 rounded-lg"
            >
              <IconCheck className="h-4 w-4" />
              Completed ({completedCount})
            </Button>
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const currentStatus = taskStatuses[task.id] || "Not Started";
              return (
                <HubCard key={task.id} className={`transition-all ${currentStatus === "Complete" ? "bg-teal/5 border-teal/30" : "hover:border-rose/40"}`}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex gap-2 items-start pt-0.5">
                            <Badge className={priorityConfig[task.priority as keyof typeof priorityConfig].color}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.category}</Badge>
                            {currentStatus === "Complete" && <Badge className="bg-teal/10 text-teal border-teal/20">Done</Badge>}
                          </div>
                        </div>
                        <p className="font-medium text-foreground mt-2">{task.id}: {task.task}</p>
                        <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap items-center">
                          <span>Hours: <span className="font-medium text-foreground">{task.hours}h</span></span>
                          <span>Owner: <span className="font-medium text-foreground">{task.owner}</span></span>
                          <div className="flex gap-2 ml-auto">
                            <Button
                              size="sm"
                              variant={currentStatus === "Not Started" ? "default" : "outline"}
                              onClick={() => updateTaskStatus(task.id, "Not Started")}
                              className="h-7 text-xs rounded-lg"
                            >
                              Not Started
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus === "In Progress" ? "default" : "outline"}
                              onClick={() => updateTaskStatus(task.id, "In Progress")}
                              className="h-7 text-xs rounded-lg"
                            >
                              In Progress
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus === "Complete" ? "default" : "outline"}
                              onClick={() => updateTaskStatus(task.id, "Complete")}
                              className={`h-7 text-xs rounded-lg ${currentStatus === "Complete" ? "bg-teal hover:bg-teal/90" : ""}`}
                            >
                              Complete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                </HubCard>
              );
            })}
          </div>
        </TabsContent>

        {/* Sitemap Tab */}
        <TabsContent value="sitemap" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HubCard>
              <HubCardHeader
                title="Public Pages"
                subtitle={`${stats.public} pages`}
                color="rose"
                noBottomPadding
              />
              <div className="pt-4 space-y-2 max-h-96 overflow-y-auto">
                {sitemap.filter((s) => s.access.includes("Public")).map((page) => (
                  <div key={page.url} className="text-sm border-l-2 border-rose/30 pl-3 py-1">
                    <code className="text-xs bg-[var(--hub-canvas)] px-2 py-1 rounded text-teal font-mono">{page.url}</code>
                    <div className="text-xs text-muted-foreground mt-0.5">{page.title}</div>
                  </div>
                ))}
              </div>
            </HubCard>

            <HubCard>
              <HubCardHeader
                title="Protected Hub Pages"
                subtitle={`${stats.protected} pages`}
                color="teal"
                noBottomPadding
              />
              <div className="pt-4 space-y-2 max-h-96 overflow-y-auto">
                {sitemap.filter((s) => s.access === "Protected").map((page) => (
                  <div key={page.url} className="text-sm border-l-2 border-teal/30 pl-3 py-1">
                    <code className="text-xs bg-[var(--hub-canvas)] px-2 py-1 rounded text-teal font-mono">{page.url}</code>
                    <div className="text-xs text-muted-foreground mt-0.5">{page.title}</div>
                  </div>
                ))}
              </div>
            </HubCard>
          </div>
        </TabsContent>
      </Tabs>

      <HubCard>
        <HubCardHeader
          title="Resources"
          subtitle="Reference materials for this review"
          noBottomPadding
        />
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            For the full spreadsheet with detailed notes, image inventory, and design system reference, see:
          </p>
          <code className="text-xs bg-[var(--hub-canvas)] rounded px-2 py-1 mt-2 block text-teal font-mono border border-[var(--hub-border)]">
            /Documents/eternal-fitness/EF_Website_Review_Spreadsheet.csv
          </code>
        </div>
      </HubCard>
    </div>
  );
}
