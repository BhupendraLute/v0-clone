import ProjectView from "@/modules/projects/components/project-view";
import React from "react";

const ProjectPage = async ({ params }) => {
	const { projectId } = await params;
	return <ProjectView projectId={projectId} />;
};

export default ProjectPage;
