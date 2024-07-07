type ErrorStateProps = {
  error: Error
}

export function ErrorState(props: ErrorStateProps) {
  return (
    <div className="flex items-center h-10 p-3 my-2 text-sm border rounded-md">
      <div className="flex items-center text-red-500 mr-2">
        <span className="font-medium">Error:</span>
      </div>
      <div className="text-foreground">{props.error.message}</div>
    </div>
  )
}
