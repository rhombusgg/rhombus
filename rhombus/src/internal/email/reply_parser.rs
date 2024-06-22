/// Adapted from https://github.com/github/email_reply_parser
use fancy_regex::Regex;

pub struct Email {
    fragments: Vec<Fragment>,
}

impl Default for Email {
    fn default() -> Self {
        Self::new()
    }
}

impl Email {
    pub fn new() -> Self {
        Email {
            fragments: Vec::new(),
        }
    }

    pub fn read(&mut self, text: &str) -> &Self {
        let mut text = text.replace("\r\n", "\n");
        let re_multiline_header = Regex::new(r"^(?!On.*On\s.+?wrote:)(On\s(.+?)wrote:)$").unwrap();
        if let Ok(Some(m)) = re_multiline_header.captures(&text) {
            let header = m.get(1).unwrap().as_str().replace('\n', " ");
            text = re_multiline_header
                .replace(&text, header.as_str())
                .to_string();
        }

        let lines = text.lines().collect::<Vec<_>>();
        let signature_re =
            Regex::new(r"(?m)(--\s*$|__\s*$|\w-$)|(^(\w+\s+){1,3}ym morf tneS$)").unwrap();
        let mut found_visible = false;
        let mut fragment: Option<Fragment> = None;

        for line in lines.iter().rev() {
            let line = line.trim_end_matches('\n').to_string();
            let is_quoted = line.starts_with('>');

            if let Some(ref mut frag) = fragment {
                if line.is_empty() && signature_re.is_match(frag.lines.last().unwrap()).unwrap() {
                    frag.signature = true;
                    Email::finish_fragment(&mut fragment, &mut self.fragments, &mut found_visible);
                    fragment = None;
                } else if frag.quoted == is_quoted
                    || (frag.quoted && (Email::quote_header(&line) || line.is_empty()))
                {
                    frag.lines.push(line);
                } else {
                    Email::finish_fragment(&mut fragment, &mut self.fragments, &mut found_visible);
                    fragment = Some(Fragment::new(is_quoted, line));
                }
            } else {
                fragment = Some(Fragment::new(is_quoted, line));
            }
        }

        if let Some(frag) = fragment {
            Email::finish_fragment(&mut Some(frag), &mut self.fragments, &mut found_visible);
        }

        self.fragments.reverse();
        self
    }

    fn finish_fragment(
        fragment: &mut Option<Fragment>,
        fragments: &mut Vec<Fragment>,
        found_visible: &mut bool,
    ) {
        if let Some(mut frag) = fragment.take() {
            frag.finish();
            if !*found_visible {
                if frag.quoted || frag.signature || frag.to_string().trim().is_empty() {
                    frag.hidden = true;
                } else {
                    *found_visible = true;
                }
            }
            fragments.push(frag);
        }
    }

    fn quote_header(line: &str) -> bool {
        let header_re = Regex::new(r"^On .+ wrote:$|^.*:(From|Sent|To|Subject)$").unwrap();
        header_re.is_match(line).unwrap()
    }

    pub fn visible_text(&self) -> String {
        self.fragments
            .iter()
            .filter(|f| !f.hidden)
            .map(|f| f.to_string())
            .collect::<Vec<String>>()
            .join("\n")
            .trim_end()
            .to_string()
    }
}

pub struct Fragment {
    quoted: bool,
    signature: bool,
    hidden: bool,
    lines: Vec<String>,
    content: Option<String>,
}

impl Fragment {
    pub fn new(quoted: bool, first_line: String) -> Self {
        Fragment {
            quoted,
            signature: false,
            hidden: false,
            lines: vec![first_line],
            content: None,
        }
    }

    pub fn finish(&mut self) {
        let content = self
            .lines
            .iter()
            .rev()
            .cloned()
            .collect::<Vec<String>>()
            .join("\n");
        self.content = Some(content);
        self.lines.clear();
    }
}

impl std::fmt::Display for Fragment {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}", self.content.clone().unwrap_or_default())
    }
}

pub fn visible_text(text: &str) -> String {
    Email::new().read(text).visible_text()
}
