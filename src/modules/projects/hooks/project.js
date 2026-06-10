import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, getProjectById, getProjects } from "../actions";

export const useGetProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => await getProjects()
    })
}

export const useCreateProject = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (Value) => createProject(Value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects", "status"] })
        }
    })
}

export const useGetProjectById = (projectId) => {
    return useQuery({
        queryKey: ["project", projectId],
        queryFn: async () => await getProjectById(projectId)
    })
}