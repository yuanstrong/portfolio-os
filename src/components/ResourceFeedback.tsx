type ResourceFeedbackProps = {
  message: string;
};

export function ResourceLoading({ message }: ResourceFeedbackProps) {
  return (
    <p className="font-code text-code text-on-surface-variant uppercase tracking-widest">
      {message}
    </p>
  );
}

export function ResourceEmpty({ message }: ResourceFeedbackProps) {
  return (
    <p className="font-body-md text-body-md text-on-surface-variant">
      {message}
    </p>
  );
}

export function ResourceError({ message }: ResourceFeedbackProps) {
  return (
    <p className="font-body-md text-body-md text-red-300">
      {message}
    </p>
  );
}
