---
layout: post

title: test post please ignore
subtitle: "What's in the box"
cover_image: blog-cover.png

excerpt: "Cyph is a revolutionary new secure messenger, created to defend the world from mass surveillance."

author:
  name: Ryan Lester
  twitter: TheRyanLester
  gplus: +RyanLester 
  bio: Co-founder
  image: ks.png
---

Incorporated provides a great typography, responsive design, author details, semantic markup and more.

You can set customize post covers, and other things directly in the post front matter:

{% highlight yaml %}
layout: post

title: test post please ignore
subtitle: "What's in the box"

# Setup post cover image in /images/
cover_image: blog-cover.png

excerpt: "Incorporated provides a great typography, responsive design, author details, semantic markup and more."

# Author details, including Google Plus authorship
author:
  name: Ryan Lester
  twitter: TheRyanLester
  gplus: +RyanLester 
  bio: Co-founder
  image: ks.jpg
  
# Keep it as draft, not published in index.html or feed.xml
draft: false
{% endhighlight %}

#### Configurable & Code Snipped Highlighting

/blog/assets/stylesheets/main.scss:
{% highlight scss %}

/* Bodytext font */
$font: "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;

/* Font for headings */
$fontheadings: "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;

/* Text colors */
$text: #21272d;
$textmuted: #848484;
$accent: #2077b2;    
{% endhighlight %}

config.yml:
{% highlight yaml %}
inc:
  # Blog Information
  title:        "Cyph"
  subtitle:     "News from the most powerful encrypted messenger"
  cover_image:  blog-cover.png
  
  # Company information
  company:      Cyph
  url:          https://www.cyph.com/
  facebook:     pages/Cyph/299270843606014
  twitter:      cyph
  about_link:   https://www.cyph.com/about/
  
  # Product Information
  product_link: https://www.cyph.im/
  tagline:      "Completely private voice &amp; video chat"
  
  # Comments
  disqus:
    # Eg. "exampleblog" Set to false to disable comments
    shortname:  cyph
  
  
  # Sharing settings
  sharing:
    twitter:    true
    facebook:   true
    gplus:      true
    hn:         true
    
  
 # Analytics     
  analytics:
    google: 
      # eg. 'UA-123-12'
      id:       false    
{% endhighlight %}

**Zoomable images**
<div class="full zoomable"><img src="/blog/images/incorporated.jpg"></div>

**Awesome quotes**
> “Effective companies tend to communicate more, their people are curious and they have opinions”

Stay tuned for updates.